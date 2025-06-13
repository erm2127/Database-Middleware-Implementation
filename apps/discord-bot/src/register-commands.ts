// apps/discord-bot/src/register-commands.ts
import { REST, Routes, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import 'dotenv/config';
import pino from 'pino';
import { z } from 'zod';

// Configuration schema
const EnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1, 'Discord bot token is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'Discord client ID is required'),
  DISCORD_GUILD_ID: z.string().min(1, 'Discord guild ID is required'),
});

type EnvConfig = z.infer<typeof EnvSchema>;

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Command definitions
const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    name: 'generate',
    description: 'Generates an image based on a prompt',
    options: [
      {
        name: 'prompt',
        description: 'The description of the image to generate',
        type: 3, // ApplicationCommandOptionType.String
        required: true,
      },
      {
        name: 'style',
        description: 'Optional style for the generated image',
        type: 3, // ApplicationCommandOptionType.String
        required: false,
        choices: [
          { name: 'Realistic', value: 'realistic' },
          { name: 'Anime', value: 'anime' },
          { name: 'Abstract', value: 'abstract' },
        ],
      },
    ],
  },
  {
    name: 'help',
    description: 'Displays available commands and usage',
  },
  {
    name: 'status',
    description: 'Checks the bot’s status and recent activity',
  },
];

// REST client setup
const createRestClient = (token: string): REST => {
  return new REST({ version: '10' }).setToken(token);
};

// Command registration function
const registerCommands = async (env: EnvConfig): Promise<void> => {
  const rest = createRestClient(env.DISCORD_BOT_TOKEN);

  try {
    logger.info({ commandCount: commands.length }, 'Registering slash commands');

    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
      { body: commands },
    );

    logger.info('Successfully registered slash commands');
  } catch (error) {
    logger.error({ error }, 'Failed to register slash commands');
    throw error;
  }
};

// Main execution
const main = async (): Promise<void> => {
  try {
    // Validate environment variables
    const env = EnvSchema.parse(process.env);
    await registerCommands(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ error: error.errors }, 'Environment variable validation failed');
      process.exit(1);
    }
    logger.error({ error }, 'Unexpected error during command registration');
    process.exit(1);
  }
};

// Execute
main().catch((error) => {
  logger.error({ error }, 'Command registration failed');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down command registration process');
  process.exit(0);
});
