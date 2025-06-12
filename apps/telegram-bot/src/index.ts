// apps/telegram-bot/src/index.ts
import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import pino from 'pino';
import { z } from 'zod';

// Configuration
const CONFIG = {
  MCP_SERVER_URL: process.env.MCP_SERVER_URL || 'http://localhost:4000',
  POLLING_INTERVAL: 1000,
  RATE_LIMIT: {
    points: 5, // 5 requests
    duration: 60, // per 60 seconds
  },
} as const;

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Types
const ApiResponseSchema = z.object({
  success: z.boolean(),
  imageUrl: z.string().url().optional(),
  error: z.string().optional(),
});

type ApiResponse = z.infer<typeof ApiResponseSchema>;

interface GenerateImagePayload {
  prompt: string;
  userId: string;
  service: 'telegram-bot';
}

// Rate limiter
const rateLimiter = new RateLimiterMemory({
  points: CONFIG.RATE_LIMIT.points,
  duration: CONFIG.RATE_LIMIT.duration,
});

// Bot initialization
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  logger.error('Telegram bot token not found');
  process.exit(1);
}

const bot = new TelegramBot(token, {
  polling: { interval: CONFIG.POLLING_INTERVAL },
});

// Error handling for polling
bot.on('polling_error', (error) => {
  logger.error({ error }, 'Polling error occurred');
});

// API Service
const generateImage = async (payload: GenerateImagePayload): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${CONFIG.MCP_SERVER_URL}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Source': 'telegram-bot',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    const data = await response.json();
    const parsedData = ApiResponseSchema.safeParse(data);

    if (!parsedData.success) {
      throw new Error('Invalid API response format');
    }

    return parsedData.data;
  } catch (error) {
    logger.error({ error, payload }, 'Failed to generate image');
    throw error;
  }
};

// Command handlers
const handleGenerateCommand = async (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();
  const prompt = match?.[1]?.trim();

  if (!userId) {
    logger.warn({ chatId }, 'No user ID found');
    return;
  }

  if (!prompt) {
    await bot.sendMessage(chatId, '❓ Please provide a prompt. Usage: /generate <description>');
    return;
  }

  try {
    // Rate limiting
    await rateLimiter.consume(userId);

    await bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendMessage(chatId, `🎨 Generating image for: "${prompt}"... Please wait.`);

    const response = await generateImage({
      prompt,
      userId,
      service: 'telegram-bot',
    });

    if (response.success && response.imageUrl) {
      await bot.sendPhoto(chatId, response.imageUrl, {
        caption: `✅ Generated image for: "${prompt}"`,
        reply_to_message_id: msg.message_id,
      });
      logger.info({ userId, prompt }, 'Image generated successfully');
    } else {
      await bot.sendMessage(chatId, `❌ Error: ${response.error || 'Failed to generate image'}`);
      logger.warn({ userId, prompt, error: response.error }, 'Image generation failed');
    }
  } catch (error) {
    if (error instanceof RateLimiterMemory.RateLimiterRes) {
      await bot.sendMessage(
        chatId,
        `⏳ Please wait ${Math.ceil(error.msBeforeNext / 1000)} seconds before trying again.`,
      );
      logger.warn({ userId }, 'Rate limit exceeded');
    } else {
      await bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again later.');
      logger.error({ error, userId, prompt }, 'Error in generate command');
    }
  }
};

// Additional commands
const handleStartCommand = async (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    '👋 Welcome to the Image Generation Bot!\nUse /generate <description> to create images.\nExample: /generate A futuristic city at sunset',
    { reply_to_message_id: msg.message_id },
  );
  logger.info({ chatId }, 'Start command executed');
};

const handleHelpCommand = async (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    'ℹ️ Commands:\n/generate <description> - Generate an image\n/start - Show welcome message\n/help - Show this help',
    { reply_to_message_id: msg.message_id },
  );
  logger.info({ chatId }, 'Help command executed');
};

// Register commands
bot.onText(/\/generate (.+)/, handleGenerateCommand);
bot.onText(/\/start/, handleStartCommand);
bot.onText(/\/help/, handleHelpCommand);

// Log bot startup
bot.getMe().then((botInfo) => {
  logger.info({ botUsername: botInfo.username }, 'Telegram bot is running');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down bot');
  bot.stopPolling();
  process.exit(0);
});
