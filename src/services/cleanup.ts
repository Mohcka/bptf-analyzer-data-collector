import { db } from '@/db/database';
import { listingEventsTable } from '@/db/schema';
import { lt } from 'drizzle-orm';
import { config } from '@/config/environment';

// Function to delete old data
export async function cleanupOldData() {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - config.RETENTION_HOURS);
    
    console.log(`Deleting listing events older than ${cutoffTime.toISOString()}`);
    
    const result = await db.delete(listingEventsTable)
      .where(lt(listingEventsTable.createdAt, cutoffTime));
    
    console.log(`Deleted old listing events (retention: ${config.RETENTION_HOURS}h)`);
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
}

// Schedule cleanup to run periodically
export function scheduleCleanup() {
  console.log(`Scheduling data cleanup every ${config.CLEANUP_INTERVAL_MINUTES} minutes`);
  
  setInterval(cleanupOldData, config.CLEANUP_INTERVAL_MINUTES * 60 * 1000);
  
  // Run cleanup immediately
  cleanupOldData();
}
