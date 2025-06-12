// apps/analytics-service/src/index.ts
import { prisma, ApiRequestLog } from '@repo/db';
import { logger } from '@repo/logger'; // Centralized logging utility
import { AnalyticsReport, ServiceUsage } from './types';
import { config } from './config'; // Configuration for the analytics job

async function runAnalytics(): Promise<AnalyticsReport | null> {
  logger.info('Starting daily analytics job', { timestamp: new Date().toISOString() });

  try {
    // 1. Define the time range based on configuration
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - config.timeRangeHours * 60 * 60 * 1000);

    // 2. Query logs with optimized selection
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
        responseTime: true, // Assuming this field exists
      },
    });

    if (recentLogs.length === 0) {
      logger.warn('No API request logs found', { startDate, endDate });
      return null;
    }

    // 3. Calculate metrics
    const totalRequests = recentLogs.length;
    const successfulRequests = recentLogs.filter((log: ApiRequestLog) => log.status === 'SUCCESS').length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;

    const usageByService: ServiceUsage = recentLogs.reduce((acc: ServiceUsage, log: ApiRequestLog) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {});

    // 4. Calculate additional metrics (e.g., average response time)
    const avgResponseTime =
      recentLogs.reduce((sum: number, log: ApiRequestLog) => sum + (log.responseTime || 0), 0) / totalRequests;

    // 5. Build the report
    const report: AnalyticsReport = {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      usageByService,
      avgResponseTime,
      timestamp: endDate,
    };

    // 6. Log the report in a structured format
    logger.info('Daily Analytics Report', {
      ...report,
      successRate: `${report.successRate.toFixed(2)}%`,
      avgResponseTime: `${report.avgResponseTime.toFixed(2)}ms`,
    });

    // 7. Save the report to the database
    await prisma.analyticsReport.create({
      data: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate,
        avgResponseTime,
        usageByService: JSON.stringify(usageByService),
        createdAt: report.timestamp,
      },
    });

    return report;

  } catch (error: unknown) {
    logger.error('Failed to run analytics job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error; // Allow caller to handle
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution with proper exit handling
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
