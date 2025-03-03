import { setupCleanupJobs } from './cleanup-scheduler';
import { setupDailyAggregationJob } from './daily-aggregation-scheduler';

export function initializeSchedulers() {
  console.log('Initializing all schedulers...');
  
  // Start the cleanup jobs
  const cleanupJobs = setupCleanupJobs();
  
  // Start the daily aggregation job
  const dailyAggregationJob = setupDailyAggregationJob();
  
  console.log('All schedulers initialized');
  
  return {
    cleanupJobs,
    dailyAggregationJob
  };
}
