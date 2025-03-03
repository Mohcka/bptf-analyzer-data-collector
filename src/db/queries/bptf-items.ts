import { eq, and, sql, desc, between, inArray, lt, gte, or } from "drizzle-orm";
import { db } from "@/db/database";
import { bptfItemsTable, bptfItemHourlyStatsTable, bptfItemDailyStatsTable } from "@/db/schema";

export type BptfItemData = {
  itemName: string;
  itemQualityName: string | null;
  itemImageUrl: string;
  itemColor: string | null;
};

/**
 * Process raw websocket events directly for BPTF item tracking
 * This function handles the entire ETL pipeline from raw events to structured data
 */
export async function processBptfEventsFromWebsocket(events: BPTFListingEvent[]): Promise<number> {
  // Filter only relevant events
  const relevantEvents = events.filter(event =>
    event.event === 'listing-update' || event.event === 'listing-delete'
  );

  if (relevantEvents.length === 0) {
    return 0;
  }

  // Pre-process events into the format needed for batch processing
  const batchItems: Array<{
    itemName: string;
    eventType: 'listing-update' | 'listing-delete';
    hourTimestamp: Date;
    priceValue?: number | null;
    priceUsd?: number | null;
    keysAmount?: number | null;
    metalAmount?: number | null;
    itemQualityName?: string | null;
    itemImageUrl?: string;
    itemColor?: string | null;
  }> = [];

  // Extract relevant data from each event
  for (const event of relevantEvents) {
    const { item, value } = event.payload;

    const now = new Date();

    // Truncate to hour precision for grouping
    const hourTimestamp = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0, 0, 0
    );

    batchItems.push({
      itemName: item.name,
      eventType: event.event as 'listing-update' | 'listing-delete',
      hourTimestamp,
      itemQualityName: item.quality?.name || null,
      itemImageUrl: item.imageUrl,
      itemColor: item.quality?.color || null,
      priceValue: value ? parseFloat(value.raw.toString()) || null : null,
      priceUsd: item.price.community?.usd ? parseFloat(item.price.community.usd.toString()) : null,
      keysAmount: event.payload.currencies.keys ? parseFloat(event.payload.currencies.keys.toString()) : null,
      metalAmount: event.payload.currencies.metal ? parseFloat(event.payload.currencies.metal.toString()) : null,
    });
  }

  // Process data in a batch transaction
  return db.transaction(async (trx) => {
    // Group events by itemName and hourTimestamp
    const itemsToUpsert = new Map<string, BptfItemData>();
    const statsByKey = new Map<string, {
      itemName: string;
      hourTimestamp: Date;
      updateCount: number;
      deleteCount: number;
      priceValues: number[];
      priceUsds: number[];
      keysAmounts: number[];
      metalAmounts: number[];
    }>();

    // Aggregate data
    for (const item of batchItems) {
      // Track items for upserting
      if (!itemsToUpsert.has(item.itemName)) {
        itemsToUpsert.set(item.itemName, {
          itemName: item.itemName,
          itemQualityName: item.itemQualityName || null,
          itemImageUrl: item.itemImageUrl || '',
          itemColor: item.itemColor || null
        });
      }

      // Group stats by the unique item+hour combination
      const hourKey = `${item.itemName}_${item.hourTimestamp.toISOString()}`;

      if (!statsByKey.has(hourKey)) {
        statsByKey.set(hourKey, {
          itemName: item.itemName,
          hourTimestamp: item.hourTimestamp,
          updateCount: 0,
          deleteCount: 0,
          priceValues: [],
          priceUsds: [],
          keysAmounts: [],
          metalAmounts: []
        });
      }

      const stats = statsByKey.get(hourKey)!;

      // Increment appropriate counter
      if (item.eventType === 'listing-update') {
        stats.updateCount++;
      } else {
        stats.deleteCount++;
      }

      // Add price data when available
      if (item.priceValue !== undefined && item.priceValue !== null) {
        stats.priceValues.push(item.priceValue);
      }

      if (item.priceUsd !== undefined && item.priceUsd !== null) {
        stats.priceUsds.push(item.priceUsd);
      }

      if (item.keysAmount !== undefined && item.keysAmount !== null) {
        stats.keysAmounts.push(item.keysAmount);
      }

      if (item.metalAmount !== undefined && item.metalAmount !== null) {
        stats.metalAmounts.push(item.metalAmount);
      }
    }

    // Batch upsert all items
    if (itemsToUpsert.size > 0) {
      await trx
        .insert(bptfItemsTable)
        .values(Array.from(itemsToUpsert.values()).map(item => ({
          ...item,
          updatedAt: new Date(),
          createdAt: sql`DEFAULT`
        })))
        .onConflictDoUpdate({
          target: bptfItemsTable.itemName,
          set: {
            itemQualityName: sql`EXCLUDED.item_quality_name`,
            itemImageUrl: sql`EXCLUDED.image_url`,
            itemColor: sql`EXCLUDED.item_quality_color`,
            updatedAt: new Date()
          }
        });
    }

    // Batch upsert all hourly stats
    if (statsByKey.size > 0) {
      // Instead of doing complex calculations in SQL, we'll use a simpler approach that avoids type issues
      // First, get existing records
      const hourKeys = Array.from(statsByKey.keys()).map(key => {
        const [itemName, hourStr] = key.split('_', 2);
        const hourTimestamp = new Date(hourStr);
        return { itemName, hourTimestamp };
      });

      // Create a composite where condition for fetching existing records
      const existingStatsConditions = hourKeys.map(({ itemName, hourTimestamp }) =>
        and(
          eq(bptfItemHourlyStatsTable.itemName, itemName),
          eq(bptfItemHourlyStatsTable.hourTimestamp, hourTimestamp)
        )
      );

      const existingStats = await trx
        .select()
        .from(bptfItemHourlyStatsTable)
        .where(or(...existingStatsConditions));

      // Create a map of existing stats for quick lookup
      const existingStatsMap = new Map(
        existingStats.map(stat => [`${stat.itemName}_${stat.hourTimestamp.toISOString()}`, stat])
      );

      // Prepare values for update/insert
      const valuesToUpsert = [];

      // Process each stat, applying calculations in JavaScript instead of SQL
      for (const [hourKey, stat] of statsByKey.entries()) {
        // Calculate averages
        const avgPriceValue = stat.priceValues.length > 0
          ? stat.priceValues.reduce((sum, val) => sum + val, 0) / stat.priceValues.length
          : null;

        const avgPriceUsd = stat.priceUsds.length > 0
          ? stat.priceUsds.reduce((sum, val) => sum + val, 0) / stat.priceUsds.length
          : null;

        const avgKeysAmount = stat.keysAmounts.length > 0
          ? stat.keysAmounts.reduce((sum, val) => sum + val, 0) / stat.keysAmounts.length
          : null;

        const avgMetalAmount = stat.metalAmounts.length > 0
          ? stat.metalAmounts.reduce((sum, val) => sum + val, 0) / stat.metalAmounts.length
          : null;

        // If the record exists, we need to update with merged values
        if (existingStatsMap.has(hourKey)) {
          const existing = existingStatsMap.get(hourKey)!;
          const totalUpdateCount = existing.updateCount + stat.updateCount;
          const totalDeleteCount = existing.deleteCount + stat.deleteCount;

          // Calculate weighted averages in JavaScript
          let mergedPriceValue = null;
          if (avgPriceValue !== null && existing.avgPriceValue !== null) {
            // Convert decimal to number for calculation if needed
            const existingAvgPrice = typeof existing.avgPriceValue === 'string'
              ? parseFloat(existing.avgPriceValue)
              : Number(existing.avgPriceValue);

            mergedPriceValue = ((existingAvgPrice * existing.updateCount) +
              (avgPriceValue * stat.updateCount)) /
              (existing.updateCount + stat.updateCount);
          } else if (avgPriceValue !== null) {
            mergedPriceValue = avgPriceValue;
          } else if (existing.avgPriceValue !== null) {
            mergedPriceValue = typeof existing.avgPriceValue === 'string'
              ? parseFloat(existing.avgPriceValue)
              : Number(existing.avgPriceValue);
          }

          // Do similar calculations for other averages
          let mergedPriceUsd = null;
          if (avgPriceUsd !== null && existing.avgPriceUsd !== null) {
            const existingAvgUsd = typeof existing.avgPriceUsd === 'string'
              ? parseFloat(existing.avgPriceUsd)
              : Number(existing.avgPriceUsd);

            mergedPriceUsd = ((existingAvgUsd * existing.updateCount) +
              (avgPriceUsd * stat.updateCount)) /
              (existing.updateCount + stat.updateCount);
          } else if (avgPriceUsd !== null) {
            mergedPriceUsd = avgPriceUsd;
          } else if (existing.avgPriceUsd !== null) {
            mergedPriceUsd = typeof existing.avgPriceUsd === 'string'
              ? parseFloat(existing.avgPriceUsd)
              : Number(existing.avgPriceUsd);
          }

          let mergedKeysAmount = null;
          if (avgKeysAmount !== null && existing.avgKeysAmount !== null) {
            const existingAvgKeys = typeof existing.avgKeysAmount === 'string'
              ? parseFloat(existing.avgKeysAmount)
              : Number(existing.avgKeysAmount);

            mergedKeysAmount = ((existingAvgKeys * existing.updateCount) +
              (avgKeysAmount * stat.updateCount)) /
              (existing.updateCount + stat.updateCount);
          } else if (avgKeysAmount !== null) {
            mergedKeysAmount = avgKeysAmount;
          } else if (existing.avgKeysAmount !== null) {
            mergedKeysAmount = typeof existing.avgKeysAmount === 'string'
              ? parseFloat(existing.avgKeysAmount)
              : Number(existing.avgKeysAmount);
          }

          let mergedMetalAmount = null;
          if (avgMetalAmount !== null && existing.avgMetalAmount !== null) {
            const existingAvgMetal = typeof existing.avgMetalAmount === 'string'
              ? parseFloat(existing.avgMetalAmount)
              : Number(existing.avgMetalAmount);

            mergedMetalAmount = ((existingAvgMetal * existing.updateCount) +
              (avgMetalAmount * stat.updateCount)) /
              (existing.updateCount + stat.updateCount);
          } else if (avgMetalAmount !== null) {
            mergedMetalAmount = avgMetalAmount;
          } else if (existing.avgMetalAmount !== null) {
            mergedMetalAmount = typeof existing.avgMetalAmount === 'string'
              ? parseFloat(existing.avgMetalAmount)
              : Number(existing.avgMetalAmount);
          }

          // Build the update object, only including non-null values
          const updateValues: Record<string, any> = {
            updateCount: totalUpdateCount,
            deleteCount: totalDeleteCount,
          };

          // Only set values that are not null to avoid overwriting existing data with nulls
          // And use sql tag to handle decimal type conversion
          if (mergedPriceValue !== null) updateValues.avgPriceValue = sql`${mergedPriceValue}`;
          if (mergedPriceUsd !== null) updateValues.avgPriceUsd = sql`${mergedPriceUsd}`;
          if (mergedKeysAmount !== null) updateValues.avgKeysAmount = sql`${mergedKeysAmount}`;
          if (mergedMetalAmount !== null) updateValues.avgMetalAmount = sql`${mergedMetalAmount}`;

          // Update the existing record with only the non-null values
          await trx
            .update(bptfItemHourlyStatsTable)
            .set(updateValues)
            .where(
              and(
                eq(bptfItemHourlyStatsTable.itemName, stat.itemName),
                eq(bptfItemHourlyStatsTable.hourTimestamp, stat.hourTimestamp)
              )
            );
        }
        // If the record doesn't exist, insert a new one
        else {
          valuesToUpsert.push({
            id: sql`DEFAULT`,
            itemName: stat.itemName,
            hourTimestamp: stat.hourTimestamp,
            updateCount: stat.updateCount,
            deleteCount: stat.deleteCount,
            // Convert number values to strings or SQL expressions for decimal fields
            avgPriceValue: avgPriceValue !== null ? sql`${avgPriceValue}` : null,
            avgPriceUsd: avgPriceUsd !== null ? sql`${avgPriceUsd}` : null,
            avgKeysAmount: avgKeysAmount !== null ? sql`${avgKeysAmount}` : null,
            avgMetalAmount: avgMetalAmount !== null ? sql`${avgMetalAmount}` : null
          });
        }
      }

      // Insert any new records
      if (valuesToUpsert.length > 0) {
        await trx.insert(bptfItemHourlyStatsTable).values(valuesToUpsert);
      }
    }

    return batchItems.length;
  });
}

/**
 * Get top bptf items with their latest hourly stats
 */
export async function getTopBptfItems(itemCount: number = 10, timeFrameInMinutes: number = 60) {
  const timeAgo = new Date(Date.now() - timeFrameInMinutes * 60 * 1000);

  // Get trending items based on hourly stats table
  const items = await db
    .select({
      itemName: bptfItemsTable.itemName,
      itemQualityName: bptfItemsTable.itemQualityName,
      itemImageUrl: bptfItemsTable.itemImageUrl,
      itemColor: bptfItemsTable.itemColor,
      updateCount: sql<number>`SUM(${bptfItemHourlyStatsTable.updateCount})`.as("updateCount"),
      deleteCount: sql<number>`SUM(${bptfItemHourlyStatsTable.deleteCount})`.as("deleteCount"),
      // Calculate totalCount as the sum of updateCount and deleteCount
      totalCount: sql<number>`SUM(${bptfItemHourlyStatsTable.updateCount} + ${bptfItemHourlyStatsTable.deleteCount})`.as("totalCount"),
      avgPriceValue: sql<number | null>`AVG(${bptfItemHourlyStatsTable.avgPriceValue})`.as("avgPriceValue"),
      avgPriceUsd: sql<number | null>`AVG(${bptfItemHourlyStatsTable.avgPriceUsd})`.as("avgPriceUsd"),
      avgKeysAmount: sql<number | null>`AVG(${bptfItemHourlyStatsTable.avgKeysAmount})`.as("avgKeysAmount"),
      avgMetalAmount: sql<number | null>`AVG(${bptfItemHourlyStatsTable.avgMetalAmount})`.as("avgMetalAmount")
    })
    .from(bptfItemsTable)
    .leftJoin(
      bptfItemHourlyStatsTable,
      and(
        eq(bptfItemsTable.itemName, bptfItemHourlyStatsTable.itemName),
        between(bptfItemHourlyStatsTable.hourTimestamp, timeAgo, new Date())
      )
    )
    .groupBy(
      bptfItemsTable.itemName,
      bptfItemsTable.itemQualityName,
      bptfItemsTable.itemImageUrl,
      bptfItemsTable.itemColor
    )
    // Simple ordering by total activity
    .orderBy(desc(sql`SUM(${bptfItemHourlyStatsTable.updateCount} + ${bptfItemHourlyStatsTable.deleteCount})`))
    .limit(itemCount);

  return items;
}

/**
 * Get hourly data for specific items
 */
export async function getItemsHourlyData(
  itemNames: string[],
  timeFrameInMinutes: number = 60
): Promise<Record<string, number[]>> {
  const timeAgo = new Date(Date.now() - timeFrameInMinutes * 60 * 1000);

  if (itemNames.length === 0) return {};

  // Get hourly stats for specified items
  const hourlyStats = await db
    .select({
      itemName: bptfItemHourlyStatsTable.itemName,
      hour: bptfItemHourlyStatsTable.hourTimestamp,
      updateCount: bptfItemHourlyStatsTable.updateCount,
      deleteCount: bptfItemHourlyStatsTable.deleteCount,
      // Calculate total count for each hour
      totalCount: sql<number>`(${bptfItemHourlyStatsTable.updateCount} + ${bptfItemHourlyStatsTable.deleteCount})`.as("totalCount")
    })
    .from(bptfItemHourlyStatsTable)
    .where(
      and(
        inArray(bptfItemHourlyStatsTable.itemName, itemNames),
        between(bptfItemHourlyStatsTable.hourTimestamp, timeAgo, new Date())
      )
    )
    .orderBy(bptfItemHourlyStatsTable.itemName, bptfItemHourlyStatsTable.hourTimestamp);

  // Format data for charts
  const result: Record<string, number[]> = {};

  // Group by item name and collect hourly data
  for (const stat of hourlyStats) {
    if (!result[stat.itemName]) {
      result[stat.itemName] = [];
    }
    // Use total count for simplicity
    result[stat.itemName].push(stat.totalCount);
  }

  return result;
}
/**
 * Aggregate hourly stats into daily stats
 * This should be run once a day to aggregate the previous day's hourly stats
 */
export async function aggregateHourlyToDailyStats(date: Date = new Date()): Promise<number> {
  try {
    // Set the date to the beginning of the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    // Set the date to the end of the day
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Aggregating hourly stats to daily stats for ${startOfDay.toISOString()}`);

    // Get all hourly stats for the given day
    const hourlyStats = await db
      .select({
        itemName: bptfItemHourlyStatsTable.itemName,
        updateCount: sql<number>`SUM(${bptfItemHourlyStatsTable.updateCount})`.as("updateCount"),
        deleteCount: sql<number>`SUM(${bptfItemHourlyStatsTable.deleteCount})`.as("deleteCount"),
        // Calculate weighted averages
        // We use weighted average because each hour might have different number of updates
        avgPriceValue: sql<string | null>`
          CASE
            WHEN SUM(${bptfItemHourlyStatsTable.updateCount}) > 0 
            THEN (SUM(
              COALESCE(${bptfItemHourlyStatsTable.avgPriceValue}::numeric, 0) * 
              ${bptfItemHourlyStatsTable.updateCount}
            ) / SUM(${bptfItemHourlyStatsTable.updateCount}))::text
            ELSE NULL
          END
        `.as("avgPriceValue"),
        avgPriceUsd: sql<string | null>`
          CASE
            WHEN SUM(${bptfItemHourlyStatsTable.updateCount}) > 0 
            THEN (SUM(
              COALESCE(${bptfItemHourlyStatsTable.avgPriceUsd}::numeric, 0) * 
              ${bptfItemHourlyStatsTable.updateCount}
            ) / SUM(${bptfItemHourlyStatsTable.updateCount}))::text
            ELSE NULL
          END
        `.as("avgPriceUsd"),
        avgKeysAmount: sql<string | null>`
          CASE
            WHEN SUM(${bptfItemHourlyStatsTable.updateCount}) > 0 
            THEN (SUM(
              COALESCE(${bptfItemHourlyStatsTable.avgKeysAmount}::numeric, 0) * 
              ${bptfItemHourlyStatsTable.updateCount}
            ) / SUM(${bptfItemHourlyStatsTable.updateCount}))::text
            ELSE NULL
          END
        `.as("avgKeysAmount"),
        avgMetalAmount: sql<string | null>`
          CASE
            WHEN SUM(${bptfItemHourlyStatsTable.updateCount}) > 0 
            THEN (SUM(
              COALESCE(${bptfItemHourlyStatsTable.avgMetalAmount}::numeric, 0) * 
              ${bptfItemHourlyStatsTable.updateCount}
            ) / SUM(${bptfItemHourlyStatsTable.updateCount}))::text
            ELSE NULL
          END
        `.as("avgMetalAmount"),
      })
      .from(bptfItemHourlyStatsTable)
      .where(
        and(
          gte(bptfItemHourlyStatsTable.hourTimestamp, startOfDay),
          lt(bptfItemHourlyStatsTable.hourTimestamp, endOfDay)
        )
      )
      .groupBy(bptfItemHourlyStatsTable.itemName);

    if (hourlyStats.length === 0) {
      console.log(`No hourly stats found for ${startOfDay.toDateString()}, skipping daily aggregation`);
      return 0;
    }

    // Prepare values for upsert
    const dailyValues = hourlyStats.map(stat => ({
      itemName: stat.itemName,
      dayTimestamp: startOfDay,
      updateCount: stat.updateCount || 0,
      deleteCount: stat.deleteCount || 0,
      avgPriceValue: stat.avgPriceValue,
      avgPriceUsd: stat.avgPriceUsd,
      avgKeysAmount: stat.avgKeysAmount,
      avgMetalAmount: stat.avgMetalAmount
    }));

    // Batch upsert daily stats
    const result = await db
      .insert(bptfItemDailyStatsTable)
      .values(dailyValues)
      .onConflictDoUpdate({
        target: [bptfItemDailyStatsTable.itemName, bptfItemDailyStatsTable.dayTimestamp],
        set: {
          updateCount: sql`EXCLUDED.update_count`,
          deleteCount: sql`EXCLUDED.delete_count`,
          avgPriceValue: sql`EXCLUDED.avg_price_value`,
          avgPriceUsd: sql`EXCLUDED.avg_price_usd`,
          avgKeysAmount: sql`EXCLUDED.avg_keys_amount`,
          avgMetalAmount: sql`EXCLUDED.avg_metal_amount`,
        },
      });

    console.log(`Successfully aggregated ${dailyValues.length} items into daily stats`);
    return dailyValues.length;
  } catch (error) {
    console.error('Error aggregating hourly stats to daily stats:', error);
    throw error;
  }
}

/**
 * Get top bptf items with their daily stats over a period
 */
export async function getTopBptfItemsWithDailyTrend(itemCount: number = 10, daysToLookBack: number = 7) {
  // First get the top items based on recent activity
  const topItems = await getTopBptfItems(itemCount);

  // Get the item names
  const itemNames = topItems.map(item => item.itemName);

  if (itemNames.length === 0) return { items: [], dailyTrends: {} };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToLookBack);

  // Get daily stats for these items
  const dailyStats = await db
    .select({
      itemName: bptfItemDailyStatsTable.itemName,
      day: bptfItemDailyStatsTable.dayTimestamp,
      updateCount: bptfItemDailyStatsTable.updateCount,
      deleteCount: bptfItemDailyStatsTable.deleteCount,
      avgPriceValue: bptfItemDailyStatsTable.avgPriceValue,
      avgPriceUsd: bptfItemDailyStatsTable.avgPriceUsd
    })
    .from(bptfItemDailyStatsTable)
    .where(
      and(
        inArray(bptfItemDailyStatsTable.itemName, itemNames),
        gte(bptfItemDailyStatsTable.dayTimestamp, cutoffDate)
      )
    )
    .orderBy(bptfItemDailyStatsTable.itemName, bptfItemDailyStatsTable.dayTimestamp);

  // Organize daily stats by item
  const dailyTrends: Record<string, Array<{
    day: Date,
    updateCount: number,
    deleteCount: number,
    totalCount: number,
    avgPriceValue: number | null,
    avgPriceUsd: number | null
  }>> = {};

  for (const stat of dailyStats) {
    if (!dailyTrends[stat.itemName]) {
      dailyTrends[stat.itemName] = [];
    }

    dailyTrends[stat.itemName].push({
      day: stat.day,
      updateCount: stat.updateCount,
      deleteCount: stat.deleteCount,
      totalCount: stat.updateCount + stat.deleteCount,
      avgPriceValue: stat.avgPriceValue ? Number(stat.avgPriceValue) : null,
      avgPriceUsd: stat.avgPriceUsd ? Number(stat.avgPriceUsd) : null
    });
  }

  return { items: topItems, dailyTrends };
}