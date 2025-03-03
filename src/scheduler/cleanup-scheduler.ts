import { CronJob } from 'cron';
import { db } from '@/db/database';
import { 
  listingEventsTable, 
  bptfItemHourlyStatsTable, 
  bptfItemDailyStatsTable 
} from '@/db/schema';
import { lt } from 'drizzle-orm';
import { config } from '@/config/environment';

/**
 * Cleanup old listing event data
 */
async function cleanupOldListingEvents() {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - config.RETENTION_HOURS);
    
    console.log(`Deleting listing events older than ${cutoffTime.toISOString()}`);
    
    const result = await db.delete(listingEventsTable)
      .where(lt(listingEventsTable.createdAt, cutoffTime));
    
    console.log(`Deleted old listing events (retention: ${config.RETENTION_HOURS}h)`);
  } catch (error) {
    console.error('Error cleaning up old listing events data:', error);
  }
}

/**
 * Cleanup old hourly stats data (older than 8 hours)
 */
async function cleanupOldHourlyStats() {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 8);
    
    console.log(`Deleting hourly stats older than ${cutoffTime.toISOString()}`);
    
    const result = await db.delete(bptfItemHourlyStatsTable)
      .where(lt(bptfItemHourlyStatsTable.hourTimestamp, cutoffTime));
    
    console.log(`Deleted old hourly stats (retention: 8h)`);
  } catch (error) {
    console.error('Error cleaning up old hourly stats data:', error);
  }
}

/**
 * Cleanup old daily stats data (older than 7 days)
 */
async function cleanupOldDailyStats() {
  try {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - 7);
    
    console.log(`Deleting daily stats older than ${cutoffTime.toISOString()}`);
    
    const result = await db.delete(bptfItemDailyStatsTable)
      .where(lt(bptfItemDailyStatsTable.dayTimestamp, cutoffTime));
    
    console.log(`Deleted old daily stats (retention: 7d)`);
  } catch (error) {
    console.error('Error cleaning up old daily stats data:', error);
  }
}

/**
 * Schedule all cleanup jobs using cron
 */
export function setupCleanupJobs() {
  console.log('Setting up data cleanup schedules');
  
  // Schedule listing events cleanup (every 30 minutes)
  // const listingEventsCleanupJob = new CronJob(
  //   '*/30 * * * *',  // Run every 30 minutes
  //   async () => {
  //     console.log('Running scheduled listing events cleanup...');
  //     await cleanupOldListingEvents();
  //   },
  //   null,
  //   true,
  //   'UTC'
  // );
  
  // Schedule hourly stats cleanup (every 4 hours)
  const hourlyStatsCleanupJob = new CronJob(
    '0 */4 * * *',  // Run every 4 hours
    async () => {
      console.log('Running scheduled hourly stats cleanup...');
      await cleanupOldHourlyStats();
    },
    null,
    true,
    'UTC'
  );
  
  // Schedule daily stats cleanup (once a day at 1 AM)
  const dailyStatsCleanupJob = new CronJob(
    '0 1 * * *',  // Run every day at 1 AM
    async () => {
      console.log('Running scheduled daily stats cleanup...');
      await cleanupOldDailyStats();
    },
    null,
    true,
    'UTC'
  );
  
  // Run all cleanups immediately on startup
  cleanupOldListingEvents();
  cleanupOldHourlyStats();
  cleanupOldDailyStats();
  
  console.log('Data cleanup schedules initialized');
  
  return {
    // listingEventsCleanupJob,
    hourlyStatsCleanupJob,
    dailyStatsCleanupJob
  };
}

// Self-execution when run directly
if (require.main === module) {
  setupCleanupJobs();
}
