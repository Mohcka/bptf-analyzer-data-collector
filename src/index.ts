// import { sql } from 'drizzle-orm';
// import { db } from '@/db/database';
// import { listingEventsTable } from '@/db/schema';
import { setupDashboardUser } from '@/db/operations/user-setup';
import { createRecommendedIndexes } from '@/db/operations/create-indexes';
import { connectWebSocket } from '@/services/websocket';
import { scheduleCleanup } from '@/services/cleanup';
import { config } from '@/config/environment';
import apiApp from '@/api/index';
import { initializeTrending } from '@/scheduler/trending-scheduler';
import { initializeSchedulers } from './scheduler/init-schedulers';

// Define API server port
const API_PORT = 3000;

async function main() {
  // console.log('Clearing listing events table...');
  // await db.execute(sql`TRUNCATE TABLE ${listingEventsTable} RESTART IDENTITY;`);
  // console.log('Listing Events cleared.');

  console.log('Setting up dashboard user if none exists');
  // Setup dashboard user if environment variables are provided
  if (config.DASHBOARD_DB_USERNAME && config.DASHBOARD_DB_PASSWORD) {
    await setupDashboardUser(
      config.DASHBOARD_DB_USERNAME,
      config.DASHBOARD_DB_PASSWORD,
      config.POSTGRES_DB
    );
  }

  console.log('Creating recommended indexes...');
  // Create recommended indexes
  await createRecommendedIndexes();
  
  // Schedule periodic cleanup
  scheduleCleanup();
  
  // Initialize trending data collection
  console.log('Initializing trending data collector...');
  await initializeTrending();

  initializeSchedulers();
  
  console.log('Connecting to WebSocket...');
  connectWebSocket();

  console.log(`API server will run at http://localhost:${API_PORT}`);
}

main().catch(error => {
  console.error('Error starting application:', error);
  process.exit(1);
});

// Export for Bun to serve the application
export default {
  port: Number(API_PORT),
  fetch: apiApp.fetch,
};