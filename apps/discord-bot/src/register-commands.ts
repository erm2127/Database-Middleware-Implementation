// apps/discord-bot/src/register-commands.ts
import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const commands = [
  {
    name: 'generate',
    description: 'Generates an image based on a prompt.',
    options: [
        {
            name: 'prompt',
            description: 'The description of the image to generate',
            type: 3, // STRING type
            required: true,
        }
    ]
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID!),
      { body: commands }
    );
    console.log('Slash commands were registered successfully!');
  } catch (error) {
    console.error(error);
  }
})();