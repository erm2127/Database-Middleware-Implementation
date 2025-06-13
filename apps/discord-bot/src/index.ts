// apps/analytics-service/src/index.ts
import { prisma, ApiRequestLog } from '@repo/db';
import { logger } from '@repo/logger';
import { AnalyticsReport, ServiceUsage } from './types';
import { config } from './config';
import * as fs from 'fs/promises';
import * as path from 'path';

// Helper to calculate P95 response time
function calculateP95ResponseTime(logs: ApiRequestLog[]): number {
  const responseTimes = logs
    .map(log => log.responseTime || 0)
    .filter(time => time > 0)
    .sort((a, b) => a - b);
  const index = Math.floor(responseTimes.length * 0.95);
  return responseTimes[index] || 0;
}

async function runAnalytics(): Promise<AnalyticsReport | null> {
  logger.info('Starting daily analytics job', { timestamp: new Date().toISOString() });

  try {
    // 1. Validate configuration
    if (!Number.isFinite(config.timeRangeHours) || config.timeRangeHours <= 0) {
      throw new Error(`Invalid timeRangeHours: ${config.timeRangeHours}`);
    }

    // 2. Define the time range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - config.timeRangeHours * 60 * 60 * 1000);

    // 3. Query logs with optimized selection
    const recentLogs = await prisma.apiRequestLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
        service: true,
        responseTime: true,
      },
    });

    if (recentLogs.length === 0) {
      logger.warn('No API request logs found', { startDate, endDate });
      return null;
    }

    // 4. Calculate metrics
    const totalRequests = recentLogs.length;
    const successfulRequests = recentLogs.filter((log: ApiRequestLog) => log.status === 'SUCCESS').length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;
    const avgResponseTime =
      recentLogs.reduce((sum: number, log: ApiRequestLog) => sum + (log.responseTime || 0), 0) / totalRequests;
    const p95ResponseTime = calculateP95ResponseTime(recentLogs);

    const usageByService: ServiceUsage = recentLogs.reduce((acc: ServiceUsage, log: ApiRequestLog) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {});

    // 5. Build the report
    const report: AnalyticsReport = {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      usageByService,
      avgResponseTime,
      p95ResponseTime, // New metric
      timestamp: endDate,
    };

    // 6. Log the report
    logger.info('Daily Analytics Report', {
      ...report,
      successRate: `${report.successRate.toFixed(2)}%`,
      avgResponseTime: `${report.avgResponseTime.toFixed(2)}ms`,
      p95ResponseTime: `${report.p95ResponseTime.toFixed(2)}ms`,
    });

    // 7. Save the report to the database
    await prisma.analyticsReport.create({
      data: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate,
        avgResponseTime,
        p95ResponseTime, // Add to schema
        usageByService: JSON.stringify(usageByService),
        createdAt: report.timestamp,
      },
    });

    // 8. Save report to JSON file
    const reportPath = path.join(__dirname, `analytics-report-${endDate.toISOString().split('T')[0]}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    logger.info('Report saved to file', { file: reportPath });

    return report;

  } catch (error: unknown) {
    logger.error('Failed to run analytics job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    const report = await runAnalytics();
    logger.info(report ? 'Analytics job completed successfully' : 'No data processed', {
      timestamp: new Date().toISOString(),
    });
    process.exit(0);
  } catch (error) {
    logger.error('Analytics job failed', { error });
    process.exit(1);
  }
}

main();
