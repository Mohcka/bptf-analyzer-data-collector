import fs from "fs/promises";
import path from "path";
import { getTopBptfItems, getItemsHourlyData } from "../db/queries/bptf-items";

// Define the data directory - create a 'data' directory in your project
const DATA_DIR = path.join(process.cwd(), "data");
const BPTF_ITEMS_FILE = path.join(DATA_DIR, "bptf-items.json");

// Define the return type for better type safety
type BptfItemWithStats = {
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
  totalCount: number; // Calculated field (updateCount + deleteCount)
}

/**
 * Analyzes trending BPTF item data from the dedicated tables
 * (Does not query from listingEventsTable directly)
 */
export async function analyzeTopBptfItems(
  itemCount: number = 10, 
  timeFrameInMinutes: number = 60
): Promise<{ items: BptfItemWithStats[], hourlyData?: Record<string, number[]> }> {
  const now = new Date();
  const timeAgo = new Date(now.getTime() - timeFrameInMinutes * 60 * 1000);

  console.log(`Analyzing top BPTF items from ${timeAgo} to ${now}`);

  // Get the top items from the BPTF tables based on activity metrics
  const topItems = await getTopBptfItems(itemCount, timeFrameInMinutes);
  
  // Format the results
  const formattedItems: BptfItemWithStats[] = topItems.map(item => ({
    itemName: item.itemName,
    itemQualityName: item.itemQualityName,
    itemImageUrl: item.itemImageUrl,
    itemColor: item.itemColor,
    avgPriceValue: item.avgPriceValue !== null ? Number(item.avgPriceValue) : null,
    avgPriceUsd: item.avgPriceUsd !== null ? Number(item.avgPriceUsd) : null,
    avgKeysAmount: item.avgKeysAmount !== null ? Number(item.avgKeysAmount) : null,
    avgMetalAmount: item.avgMetalAmount !== null ? Number(item.avgMetalAmount) : null,
    updateCount: Number(item.updateCount || 0),
    deleteCount: Number(item.deleteCount || 0),
    totalCount: Number(item.totalCount || 0) // Already calculated by SQL
  }));

  // Get hourly data for the top items
  const itemNames = formattedItems.map(item => item.itemName);
  const hourlyData = await getItemsHourlyData(itemNames, timeFrameInMinutes);

  const itemsData = {
    items: formattedItems,
    hourlyData: hourlyData,
    lastUpdated: new Date().toISOString()
  };

  // Cache to file
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(BPTF_ITEMS_FILE, JSON.stringify(itemsData, null, 2));
  console.log(`BPTF items analysis saved to ${BPTF_ITEMS_FILE}`);

  return itemsData;
}

/**
 * Gets the latest BPTF items analysis (from cache if available, otherwise performs new analysis)
 */
export async function getLatestBptfItemsAnalysis(
  itemCount: number = 10, 
  timeFrameInMinutes: number = 60
): Promise<{ items: BptfItemWithStats[], hourlyData?: Record<string, number[]> }> {
  try {
    const fileData = await fs.readFile(BPTF_ITEMS_FILE, 'utf-8');
    const parsedData = JSON.parse(fileData);
    
    const lastUpdated = new Date(parsedData.lastUpdated);
    const now = new Date();
    if (now.getTime() - lastUpdated.getTime() < 60 * 60 * 1000) {
      console.log(`Using cached BPTF items analysis from ${lastUpdated}`);
      return parsedData;
    }
    
    console.log(`Cached analysis is too old (${lastUpdated}), performing fresh analysis`);
  } catch (error) {
    console.log(`Could not read BPTF items file, performing fresh analysis: ${error}`);
  }
  
  return analyzeTopBptfItems(itemCount, timeFrameInMinutes);
}
