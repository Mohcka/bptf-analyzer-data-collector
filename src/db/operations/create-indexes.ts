import { db } from "@/db/database";
import { sql } from "drizzle-orm";

async function createIndexIfNotExists(
  indexName: string,
  createIndexSql: string
): Promise<boolean> {
  try {
    // Check if index exists
    const result = await db.execute(sql`
      SELECT 1 FROM pg_indexes 
      WHERE indexname = ${indexName}
    `);

    if (result.rowCount === 0) {
      console.log(`Creating index: ${indexName}`);
      await db.execute(sql.raw(createIndexSql));
      console.log(`Index ${indexName} created successfully`);
      return true;
    } else {
      console.log(`Index ${indexName} already exists, skipping`);
      return false;
    }
  } catch (error) {
    console.error(`Failed to create index ${indexName}:`, error);
    throw error;
  }
}

export async function createRecommendedIndexes(): Promise<number> {
  try {
    console.log('Creating recommended indexes...');
    let createdCount = 0;

    // Listed date index (DESC) for sorting
    if (await createIndexIfNotExists(
      'idx_listed_at_desc',
      `CREATE INDEX IF NOT EXISTS idx_listed_at_desc ON listing_events (listed_at DESC)`
    )) createdCount++;

    // User steam ID index
    if (await createIndexIfNotExists(
      'idx_user_steam_id',
      `CREATE INDEX IF NOT EXISTS idx_steam_id ON listing_events (steam_id)`
    )) createdCount++;

    // Listing ID index
    if (await createIndexIfNotExists(
      'idx_listing_id',
      `CREATE INDEX IF NOT EXISTS idx_listing_id ON listing_events (listing_id)`
    )) createdCount++;

    // Created at index
    if (await createIndexIfNotExists(
      'idx_created_at',
      `CREATE INDEX IF NOT EXISTS idx_created_at ON listing_events (created_at)`
    )) createdCount++;

    // Base name index
    if (await createIndexIfNotExists(
      'idx_base_name',
      `CREATE INDEX IF NOT EXISTS idx_base_name ON listing_events (base_name)`
    )) createdCount++;

    // Item name index
    if (await createIndexIfNotExists(
      'idx_item_name',
      `CREATE INDEX IF NOT EXISTS idx_item_name ON listing_events (item_name)`
    )) createdCount++;

    // Market name index 
    if (await createIndexIfNotExists(
      'idx_market_name',
      `CREATE INDEX IF NOT EXISTS idx_market_name ON listing_events (market_name)`
    )) createdCount++;

    // Item quality name index
    if (await createIndexIfNotExists(
      'idx_item_quality_name',
      `CREATE INDEX IF NOT EXISTS idx_item_quality_name ON listing_events (item_quality_name)`
    )) createdCount++;

    // Event index for filtering by event type
    if (await createIndexIfNotExists(
      'idx_event',
      `CREATE INDEX IF NOT EXISTS idx_event ON listing_events (event)`
    )) createdCount++;

    // Compound index for event and createdAt (for queries that filter on both)
    if (await createIndexIfNotExists(
      'idx_event_created_at',
      `CREATE INDEX IF NOT EXISTS idx_event_created_at ON listing_events (event, created_at)`
    )) createdCount++;

    // Compound index for item_name, event, and created_at
    if (await createIndexIfNotExists(
      'idx_item_name_event_created_at',
      `CREATE INDEX IF NOT EXISTS idx_item_name_event_created_at ON listing_events (item_name, event, created_at)`
    )) createdCount++;

    // Add composite index for trending query
    if (await createIndexIfNotExists(
      'idx_event_item_quality_created',
      `CREATE INDEX IF NOT EXISTS idx_event_item_quality_created ON listing_events 
       (event, item_name, item_quality_name, created_at DESC)`
    )) createdCount++;

    // Add functional index for hourly data query if your PostgreSQL version supports it
    if (await createIndexIfNotExists(
      'idx_item_name_event_created_hour',
      `CREATE INDEX IF NOT EXISTS idx_item_name_event_created_hour ON listing_events 
       (item_name, event, date_trunc('hour', created_at))`
    )) createdCount++;

    if (createdCount > 0) {
      console.log(`Created ${createdCount} new indexes successfully`);
    } else {
      console.log('All indexes already exist, none created');
    }

    return createdCount;
  } catch (error) {
    console.error('Failed to create recommended indexes:', error);
    throw error;
  }
}

// Run this function to create all indexes
if (require.main === module) {
  createRecommendedIndexes()
    .then((count) => {
      console.log(`Index creation complete. Created ${count} new indexes.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Index creation failed:', error);
      process.exit(1);
    });
}