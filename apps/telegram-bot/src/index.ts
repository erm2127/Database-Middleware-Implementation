import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

// Define the shape of the API response
type ApiResponse = {
  success: boolean;
  imageUrl?: string;
  error?: string;
};

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Telegram bot token not found!');

const bot = new TelegramBot(token, { polling: true });
const MCP_SERVER_URL = 'http://localhost:4000';

console.log('Telegram bot is running...');

bot.onText(/\/generate (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();
  const prompt = match?.[1];

  if (!prompt || !userId) return;

  bot.sendMessage(chatId, `🎨 Generating image for: "${prompt}"... Please wait.`);

  try {
    const response = await fetch(`${MCP_SERVER_URL}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        userId,
        service: 'telegram-bot',
      }),
    });

    // Tell TypeScript to expect our ApiResponse type
    const data: ApiResponse = await response.json();

    if (data.success && data.imageUrl) {
      bot.sendPhoto(chatId, data.imageUrl, { caption: `✅ Here is your image!` });
    } else {
      bot.sendMessage(chatId, `❌ Error: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    bot.sendMessage(chatId, "❌ Sorry, the main server seems to be down.");
  }
});