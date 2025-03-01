import { collectTopTrendingItems } from "../services/trending-collector";
import { CronJob } from "cron";

// Get configuration from environment variables
const RETENTION_HOURS = parseInt(process.env.RETENTION_HOURS || '6', 10);
const ITEM_COUNT = 9; // Fixed to 9 items as requested

// Initialize trending items at startup
export async function initializeTrending() {
  try {
    // Collect initial data
    await collectTopTrendingItems(ITEM_COUNT, RETENTION_HOURS * 60);
    console.log("Initial trending data collection completed");

    // Set up cron job to run every 15 minutes
    const trendingJob = new CronJob(
      "*/15 * * * *", // Every 15 minutes
      async () => {
        try {
          console.log("Running scheduled trending data collection...");
          await collectTopTrendingItems(ITEM_COUNT, RETENTION_HOURS * 60);
          console.log("Scheduled trending data collection completed");
        } catch (error) {
          console.error("Error in scheduled trending collection:", error);
        }
      },
      null, // onComplete
      true, // start
      "UTC" // timezone
    );

    console.log("Trending scheduler initialized");
    return trendingJob;
  } catch (error) {
    console.error("Failed to initialize trending scheduler:", error);
    throw error;
  }
}
