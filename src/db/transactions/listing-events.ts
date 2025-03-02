import type { InferInsertModel } from 'drizzle-orm';

import { db } from '@/db/database';
import { listingEventsTable } from '@/db/schema';

export async function addBatchDataInTransaction(events: BPTFListingEvent[], retryCount = 0) {
  const MAX_RETRIES = 3;
  const TRANSACTION_TIMEOUT_MS = 30000; // 30 seconds
  
  try {
    // Create a promise with timeout
    const transactionPromise = db.transaction(async (trx) => {
      const listingEvents = events.map((eventData) => ({
        // Event metadata
        id: eventData.id,
        event: eventData.event,
        createdAt: new Date(),
        listingId: eventData.payload.id,

        // Currencies interface fields
        metalAmount: eventData.payload.currencies.metal?.toString(),
        keysAmount: eventData.payload.currencies.keys?.toString(),

        // Value interface fields
        valueRaw: eventData.payload.value.raw.toString(),
        valueShort: eventData.payload.value.short,
        valueLong: eventData.payload.value.long,

        // Price interface fields
        // -- Steam pricing
        itemSteamCurrency: eventData.payload.item.price.steam?.currency || null,
        itemSteamShort: eventData.payload.item.price.steam?.short || null,
        itemSteamLong: eventData.payload.item.price.steam?.long || null,
        itemSteamRaw: eventData.payload.item.price.steam?.raw?.toString() || null,
        itemSteamValue: eventData.payload.item.price.steam?.value?.toString() || null,
        // -- Community pricing
        itemPriceValue: eventData.payload.item.price.community?.value.toString() || null,
        itemPriceValueHigh: eventData.payload.item.price.community?.valueHigh?.toString() || null,
        itemCurrency: eventData.payload.item.price.community?.currency || null,
        itemPriceShort: eventData.payload.item.price.community?.short || null,
        itemPriceLong: eventData.payload.item.price.community?.long || null,
        itemPriceUsd: eventData.payload.item.price.community?.usd?.toString() || null,

        // Item interface fields
        itemBaseName: eventData.payload.item.baseName,
        itemImageUrL: eventData.payload.item.imageUrl,
        itemMarketName: eventData.payload.item.marketName,
        itemName: eventData.payload.item.name,
        itemSummary: eventData.payload.item.summary,
        itemClass: eventData.payload.item.class,
        itemSlot: eventData.payload.item.slot,
        itemTradable: eventData.payload.item.tradable,
        itemCraftable: eventData.payload.item.craftable,
        itemQualityName: eventData.payload.item.quality?.name || null,
        itemQualityColor: eventData.payload.item.quality?.color || null,

        // UserAgent interface fields
        userAgentClient: eventData.payload.userAgent?.client || "Not Specified",
        userAgentLastPulse: eventData.payload.userAgent ? new Date(eventData.payload.userAgent.lastPulse * 1000) : null,

        // User interface fields
        userSteamId: eventData.payload.user.id,
        username: eventData.payload.user.name,
        userAvatar: eventData.payload.user.avatar,
        userAvatarFull: eventData.payload.user.avatarFull,
        userBanned: eventData.payload.user.banned,
        userPremium: eventData.payload.user.premium,
        userOnline: eventData.payload.user.online,
        userCustomNameStyle: eventData.payload.user.customNameStyle,
        userAcceptedSuggestions: eventData.payload.user.acceptedSuggestions,
        userStyle: eventData.payload.user.style,
        userRole: eventData.payload.user.role,
        userTradeOfferUrl: eventData.payload.user.tradeOfferUrl,
        userIsMarketplaceSeller: eventData.payload.user.isMarketplaceSeller,
        userBans: eventData.payload.user.bans,

        // ListingPayload specific fields
        appid: eventData.payload.appid,
        tradeOffersPreferred: eventData.payload.tradeOffersPreferred,
        buyoutOnly: eventData.payload.buyoutOnly,
        details: eventData.payload.details,
        listedAt: new Date(eventData.payload.listedAt * 1000),
        bumpedAt: new Date(eventData.payload.bumpedAt * 1000),
        intent: eventData.payload.intent,
        count: eventData.payload.count,
        status: eventData.payload.status,
        source: eventData.payload.source,
        creationStatus: eventData.event,
      } satisfies InferInsertModel<typeof listingEventsTable>));

      if (listingEvents.length > 0) {
        await trx.insert(listingEventsTable).values(listingEvents);
      }
    });
    
    // Execute with timeout
    await Promise.race([
      transactionPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout')), TRANSACTION_TIMEOUT_MS)
      )
    ]);
    
    console.log(`Batch transaction committed successfully. Processed ${events.length} events`);
  } catch (error) {
    console.error(`Batch transaction failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);
    
    // Retry logic with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return addBatchDataInTransaction(events, retryCount + 1);
    }
    
    throw error; // Re-throw if max retries exceeded
  }
}
