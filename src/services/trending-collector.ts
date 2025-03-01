import { db } from "@/db/database";
import { listingEventsTable } from "../db/schema";
import { and, between, eq, sql, desc, inArray } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

// Define the data directory - create a 'data' directory in your project
const DATA_DIR = path.join(process.cwd(), "data");
const TRENDING_FILE = path.join(DATA_DIR, "trending-items.json");

// Define the return type for better type safety
type TrendingItem = {
  itemName: string;
  itemQualityName: string | null;
  itemImageUrl: string;
  itemColor: string | null;
  avgPriceValue: number | null;
  avgPriceUsd: number | null;
  avgKeysAmount: number | null;
  avgMetalAmount: number | null;
  updateCount: number;
  deleteCount: number;
  totalCount: number;
  eventCount: number;  // For backward compatibility
}

// Helper function to format hourly data for charts
function formatHourlyDataForCharts(hourlyResults: {
  itemName: string;
  hour: string;
  count: number;
}[]): Record<string, number[]> {
  const hourlyData: Record<string, Record<string, number>> = {};
  
  // Group by item name and collect hourly data points
  hourlyResults.forEach(result => {
    if (!hourlyData[result.itemName]) {
      hourlyData[result.itemName] = {};
    }
    hourlyData[result.itemName][result.hour] = Number(result.count);
  });
  
  // Convert to array format with ordered timestamps
  const chartData: Record<string, number[]> = {};
  
  Object.keys(hourlyData).forEach(itemName => {
    // Get all hours for this item
    const hours = Object.keys(hourlyData[itemName]).sort();
    
    // Create an array of counts in chronological order
    chartData[itemName] = hours.map(hour => hourlyData[itemName][hour]);
  });
  
  return chartData;
}

export async function collectTopTrendingItems(
  itemCount: number = 10, 
  timeFrameInMinutes: number = 60
): Promise<{ items: TrendingItem[], hourlyData?: Record<string, number[]> }> {
  const now = new Date();
  const timeAgo = new Date(now.getTime() - timeFrameInMinutes * 60 * 1000);

  console.log(`Collecting top trending items from ${timeAgo} to ${now}`);

  const result = await db
    .select({
      itemName: listingEventsTable.itemName,
      itemQualityName: listingEventsTable.itemQualityName,
      itemImageUrl: sql<string>`MAX(${listingEventsTable.itemImageUrL})`.as("itemImageUrl"),
      itemColor: sql<string | null>`MAX(${listingEventsTable.itemQualityColor})`.as("itemColor"),
      avgPriceValue: sql<number | null>`AVG(${listingEventsTable.valueRaw})`.as("avgPriceValue"),
      avgPriceUsd: sql<number | null>`AVG(${listingEventsTable.itemPriceUsd})`.as("avgPriceUsd"),
      avgKeysAmount: sql<number | null>`AVG(${listingEventsTable.keysAmount})`.as("avgKeysAmount"),
      avgMetalAmount: sql<number | null>`AVG(${listingEventsTable.metalAmount})`.as("avgMetalAmount"),
      updateCount: sql<number>`SUM(CASE WHEN ${listingEventsTable.event} = 'listing-update' THEN 1 ELSE 0 END)`.as("updateCount"),
      deleteCount: sql<number>`SUM(CASE WHEN ${listingEventsTable.event} = 'listing-delete' THEN 1 ELSE 0 END)`.as("deleteCount"),
      totalCount: sql<number>`COUNT(*)`.as("totalcount")
    })
    .from(listingEventsTable)
    .where(
      and(
        sql`${listingEventsTable.event} IN ('listing-update', 'listing-delete')`,
        between(listingEventsTable.createdAt, timeAgo, now)
      )
    )
    .groupBy(listingEventsTable.itemName, listingEventsTable.itemQualityName)
    .orderBy(desc(sql`totalcount`))
    .limit(itemCount);

  // Convert string values to numbers.
  const convertedResult: TrendingItem[] = result.map(item => ({
    ...item,
    avgPriceValue: item.avgPriceValue !== null ? Number(item.avgPriceValue) : null,
    avgPriceUsd: item.avgPriceUsd !== null ? Number(item.avgPriceUsd) : null,
    avgKeysAmount: item.avgKeysAmount !== null ? Number(item.avgKeysAmount) : null,
    avgMetalAmount: item.avgMetalAmount !== null ? Number(item.avgMetalAmount) : null,
    updateCount: Number(item.updateCount),
    deleteCount: Number(item.deleteCount),
    totalCount: Number(item.totalCount),
    eventCount: Number(item.totalCount),
  }));

  // Only fetch hourly data if requested
  let hourlyData: Record<string, number[]> = {};
  
  if (result.length > 0) {
    // Get all item names from result
    const itemNames = result.map(item => item.itemName);
    
    const hourlyResults = await db
      .select({
        itemName: listingEventsTable.itemName,
        hour: sql<string>`date_trunc('hour', ${listingEventsTable.createdAt})`.as("hour"),
        count: sql<number>`count(*)`.as("count")
      })
      .from(listingEventsTable)
      .where(
        and(
          inArray(listingEventsTable.itemName, itemNames),
          inArray(listingEventsTable.event, ['listing-update', 'listing-delete']),
          between(listingEventsTable.createdAt, timeAgo, now)
        )
      )
      .groupBy(listingEventsTable.itemName, sql`date_trunc('hour', ${listingEventsTable.createdAt})`)
      .orderBy(listingEventsTable.itemName, sql`date_trunc('hour', ${listingEventsTable.createdAt})`);
      
    // Format data for charts
    hourlyData = formatHourlyDataForCharts(hourlyResults);
  }

  const trendingData = {
    items: convertedResult,
    hourlyData: hourlyData,
    lastUpdated: new Date().toISOString()
  };

  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  // Write data to file
  await fs.writeFile(TRENDING_FILE, JSON.stringify(trendingData, null, 2));
  
  console.log(`Trending data saved to ${TRENDING_FILE}`);

  return trendingData;
}
