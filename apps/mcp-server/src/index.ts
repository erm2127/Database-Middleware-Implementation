import express from 'express';
import cors from 'cors';
// Import prisma client AND the specific types we need from the middleware
import { prisma, User, ApiRequestLog } from '@repo/db';

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// ... (generateImageWithAI function stays the same)
async function generateImageWithAI(prompt: string): Promise<string> {
  console.log(`AI is generating an image for prompt: "${prompt}"`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  return `https://i.pravatar.cc/512?u=${encodeURIComponent(prompt)}`;
}


// Helper to find or create a user based on platform ID
async function findOrCreateUser(id: string, platform: 'telegram' | 'discord'): Promise<User> {
  const whereClause = platform === 'telegram' ? { telegramId: id } : { discordId: id };
  let user = await prisma.user.findUnique({ where: whereClause });
  if (!user) {
    const data = platform === 'telegram' ? { telegramId: id } : { discordId: id };
    user = await prisma.user.create({ data });
  }
  return user;
}

// Endpoint for generating an image
app.post('/generate-image', async (req, res) => {
  const { prompt, userId, service } = req.body;

  if (!prompt || !userId || !service) {
    return res.status(400).json({ error: 'Missing prompt, userId, or service' });
  }

  const platform = service.includes('discord') ? 'discord' : 'telegram';
  let log: ApiRequestLog | null = null; // Give the log a proper type

  try {
    const user = await findOrCreateUser(userId, platform);

    log = await prisma.apiRequestLog.create({
      data: { userId: user.id, prompt, service, status: 'PENDING' },
    });

    const imageUrl = await generateImageWithAI(prompt);

    await prisma.generatedContent.create({
      data: { requestId: log.id, type: 'IMAGE', contentUrl: imageUrl },
    });
    await prisma.apiRequestLog.update({
      where: { id: log.id }, data: { status: 'SUCCESS' },
    });

    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error(error);
    if (log) {
      await prisma.apiRequestLog.update({ where: { id: log.id }, data: { status: 'ERROR' } });
    }
    res.status(500).json({ success: false, error: 'Failed to generate image' });
  }
});

// Endpoint for the Web Dashboard
app.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.apiRequestLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        content: true,
      },
      take: 50,
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});


app.listen(port, () => {
  console.log(`🚀 MCP Server running at http://localhost:${port}`);
});