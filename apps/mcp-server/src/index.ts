// apps/api/src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma, User, ApiRequestLog } from '@repo/db';
import { logger } from '@repo/logger';
import { config } from './config';
import { findOrCreateUser } from './services/userService';

// Request validation schema
const generateImageSchema = z.object({
  prompt: z.string().min(1).max(500),
  userId: z.string().min(1),
  service: z.enum(['telegram-bot', 'discord-bot']),
});

// Middleware to validate API key
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== config.apiKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

// Middleware to measure request time
const trackResponseTime = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    res.locals.responseTime = durationMs;
  });
  next();
};

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());
app.use(trackResponseTime);
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per user
  keyGenerator: (req) => req.body.userId || req.ip,
}));
app.use(authenticate);

async function generateImageWithAI(prompt: string): Promise<string> {
  logger.info('Generating image', { prompt });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return `https://i.pravatar.cc/512?u=${encodeURIComponent(prompt)}`;
}

app.post('/generate-image', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { prompt, userId, service } = generateImageSchema.parse(req.body);
    const platform = service.includes('discord') ? 'discord' : 'telegram';

    // Perform database operations in a transaction
    const [user, imageUrl] = await prisma.$transaction(async (tx) => {
      const user = await findOrCreateUser(userId, platform, tx);
      const log = await tx.apiRequestLog.create({
        data: { userId: user.id, prompt, service, status: 'PENDING', responseTime: 0 },
      });
      const imageUrl = await generateImageWithAI(prompt);
      await tx.generatedContent.create({
        data: { requestId: log.id, type: 'IMAGE', contentUrl: imageUrl },
      });
      await tx.apiRequestLog.update({
        where: { id: log.id },
        data: { status: 'SUCCESS', responseTime: res.locals.responseTime },
      });
      return [user, imageUrl];
    });

    logger.info('Image generated successfully', { userId, service, prompt });
    res.json({ success: true, imageUrl, requestId: user.id });
  } catch (error) {
    logger.error('Failed to generate image', { error: error instanceof Error ? error.message : 'Unknown error' });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: 'Failed to generate image' });
  }
});

app.get('/logs', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, service } = req.query;
    const parsedLimit = Math.min(Number(limit) || 50, 100);
    const parsedOffset = Number(offset) || 0;
    const where = service ? { service: String(service) } : {};

    const logs = await prisma.apiRequestLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: true, content: true },
      take: parsedLimit,
      skip: parsedOffset,
    });

    logger.info('Logs retrieved', { limit: parsedLimit, offset: parsedOffset, service });
    res.json(logs);
  } catch (error) {
    logger.error('Failed to fetch logs', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(config.port, () => {
  logger.info(`🚀 MCP Server running at http://localhost:${config.port}`);
});
