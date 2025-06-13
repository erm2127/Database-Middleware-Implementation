// apps/analytics-service/src/index.ts
import { prisma } from '@repo/db';
import { logger } from '@repo/logger'; // Centralized logging utility
import { AnalyticsReport, ServiceUsage } from './types'; // Type definitions for the report

async function runAnalytics(): Promise<AnalyticsReport | null> {
  logger.info('Starting daily analytics job...');

  try {
    // 1. Define the time range (last 24 hours)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // 2. Query the database for logs in the last 24 hours
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
        createdAt: true,
      },
    });

    if (recentLogs.length === 0) {
      logger.warn('No API request logs found in the last 24 hours.');
      return null;
    }

    // 3. Calculate analytics metrics
    const totalRequests = recentLogs.length;
    const successfulRequests = recentLogs.filter((log) => log.status === 'SUCCESS').length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;

    const usageByService: ServiceUsage = recentLogs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {} as ServiceUsage);

    // 4. Additional metrics: Average response time (assuming responseTime field exists)
    const avgResponseTime =
      recentLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / totalRequests;

    // 5. Generate the report
    const report: AnalyticsReport = {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      usageByService,
      avgResponseTime,
      timestamp: new Date(),
    };

    // 6. Log the report
    logger.info('Daily Analytics Report', {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: `${successRate.toFixed(2)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      usageByService,
    });

    // 7. Optionally save the report to the database
    await prisma.analyticsReport.create({
      data: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate,
        avgResponseTime,
        usageByService: JSON.stringify(usageByService), // Store as JSON if schema supports
        createdAt: report.timestamp,
      },
    });

    return report;

  } catch (error) {
    logger.error('Failed to run analytics job', { error });
    throw error; // Rethrow to allow caller to handle
  } finally {
    await prisma.$disconnect();
  }
}


async function main() {
  try {
    const report = await runAnalytics();
    if (report) {
      logger.info('Analytics job completed successfully.');
    } else {
      logger.info('Analytics job completed with no data to process.');
    }
  } catch (error) {
    logger.error('Analytics job failed', { error });
    process.exit(1);
  }
}

main();
