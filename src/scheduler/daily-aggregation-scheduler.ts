import { CronJob } from 'cron';
import { aggregateHourlyToDailyStats } from '@/db/queries/bptf-items';

/**
 * Create a daily aggregation job that runs at 0:15 AM every day
 * This job aggregates the previous day's hourly stats into daily stats
 */
export function setupDailyAggregationJob() {
  console.log('Setting up daily stats aggregation job');
  
  // Schedule to run at 0:15 AM every day (giving a 15-minute buffer after midnight)
  const aggregationJob = new CronJob(
    '15 0 * * *',  // Run at 0:15 AM every day
    async () => {
      console.log('Running daily stats aggregation...');
      
      // Use yesterday's date for aggregation
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      try {
        const itemsAggregated = await aggregateHourlyToDailyStats(yesterday);
        console.log(`Daily aggregation complete: processed ${itemsAggregated} items for ${yesterday.toDateString()}`);
      } catch (error) {
        console.error('Error in daily stats aggregation:', error);
      }
    },
    null,
    true,
    'UTC'
  );
  
  // Also run an immediate aggregation for yesterday to catch up if needed
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  aggregateHourlyToDailyStats(yesterday)
    .then(count => console.log(`Initial daily aggregation complete: processed ${count} items for ${yesterday.toDateString()}`))
    .catch(error => console.error('Error in initial daily aggregation:', error));
  
  console.log('Daily aggregation job initialized');
  
  return aggregationJob;
}

// Self-execution when run directly
if (require.main === module) {
  setupDailyAggregationJob();
}
