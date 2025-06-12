// apps/analytics-service/src/index.ts
import { prisma } from '@repo/db'; // <-- IMPORTING DIRECTLY FROM THE MIDDLEWARE!

async function runAnalytics() {
  console.log('Running daily analytics job...');

  try {
    // 1. Get the date for 24 hours ago
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 2. Query the database directly for logs in the last 24 hours
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

    // 3. Perform calculations
    const totalRequests = recentLogs.length;
    const successfulRequests = recentLogs.filter(log => log.status === 'SUCCESS').length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;

    const usageByService = recentLogs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);


    // 4. Print the report
    console.log('\n--- Daily Analytics Report ---');
    console.log(`Total Requests (24h): ${totalRequests}`);
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
    // Ensure the Prisma client connection is closed
    await prisma.$disconnect();
  }
}

// Run the job and exit
runAnalytics();