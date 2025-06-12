// Import the types we need
import { prisma, ApiRequestLog } from '@repo/db';

async function runAnalytics() {
  console.log('Running daily analytics job...');

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentLogs = await prisma.apiRequestLog.findMany({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
    });

    if (recentLogs.length === 0) {
      console.log('No activity in the last 24 hours.');
      return;
    }

    // Explicitly type the 'log' parameter
    const successfulRequests = recentLogs.filter((log: ApiRequestLog) => log.status === 'SUCCESS').length;
    const failedRequests = recentLogs.length - successfulRequests;
    const successRate = (successfulRequests / recentLogs.length) * 100;

    // Explicitly type the accumulator and the log
    const usageByService = recentLogs.reduce((acc: Record<string, number>, log: ApiRequestLog) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {});


    console.log('\n--- Daily Analytics Report ---');
    console.log(`Total Requests (24h): ${recentLogs.length}`);
    console.log(`✅ Successful: ${successfulRequests}`);
    console.log(`❌ Failed: ${failedRequests}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(2)}%`);
    console.log('\nUsage by Service:');
    for (const service in usageByService) {
      console.log(`- ${service}: ${usageByService[service]} requests`);
    }
    console.log('--- End of Report ---\n');

  } catch (error) {
    console.error('Failed to run analytics job:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runAnalytics();