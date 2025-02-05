import WebSocket from 'ws';
import { drizzle } from 'drizzle-orm/node-postgres'
import { Hono } from 'hono'
import { listingEventsTable, listingsTable } from './db/schema';
import { SQL } from 'bun';
import { sql } from 'drizzle-orm';

// const client = new SQL(process.env.DATABASE_URL!);
const db = drizzle(process.env.DATABASE_URL!);

const WS_URL = 'wss://ws.backpack.tf/events'; // set your websocket URL
let ws: WebSocket | null = null;

async function addDependenciesInTransaction(
  eventData: BPTFListingEvent,
  listingData: ListingPayload,
  // userData: { id: string; name: string; avatar?: string; avatarFull?: string },
  // itemData: { id: string; appid: number; baseName: string; defindex: number },
) {
  try {
    await db.transaction(async (trx) => {
      // Insert user
      // await trx.insert(usersTable).values({
      //   ...userData,
      //   premium: false,
      //   online: false,
      //   banned: false,
      // });
      // // Insert item
      // await trx.insert(itemsTable).values({
      //   ...itemData,
      //   marketName: null,
      //   name: null,
      //   origin: null,
      //   originalId: null,
      //   summary: null,
      //   tradable: false,
      //   craftable: false,
      //   priceindex: null,
      // });
      // Insert listing
      // const { id, ...restListingData } = listingData;

      const listing: typeof listingsTable.$inferInsert = {
        ...listingData,
        metalAmount: listingData.currencies.metal?.toString(),
        keysAmount: listingData.currencies.keys,
        valueRaw: listingData.value.raw.toString(),
        valueShort: listingData.value.short.toString(),
        valueLong: listingData.value.long.toString(),
        listedAt: new Date(listingData.listedAt * 1000),
        bumpedAt: new Date(listingData.bumpedAt * 1000),
        userAgentClient: listingData.userAgent?.client || "Not Specified",
        userAgentLastPulse: listingData.userAgent ? new Date(listingData.userAgent.lastPulse * 1000) : null,
        creationStatus: eventData.event,

        // user
        userSteamId: listingData.user.id,
        username: listingData.user.name,
        userAvatar: listingData.user.avatar,
        userAvatarFull: listingData.user.avatarFull,
        userBanned: listingData.user.banned,

        // item
        itemBaseName: listingData.item.baseName,
        itemImageUrL: listingData.item.imageUrl,
        itemMarketName: listingData.item.marketName,
        itemName: listingData.item.name,
        itemPriceValue: listingData.item.price.community?.value.toString() || null,
        itemPriceValueHigh: listingData.item.price.community?.valueHigh.toString() || null,
        itemCurrency: listingData.item.price.community?.currency || null,
        itemPriceShort: listingData.item.price.community?.short || null,
        itemPriceLong: listingData.item.price.community?.long || null,
        itemPriceUsd: listingData.item.price.community?.usd.toString() || null,
        itemSummary: listingData.item.summary,
        itemClass: listingData.item.class,
        itemSlot: listingData.item.slot,
      }

      const { id, ...listingWithoutId } = listing;

      await trx.insert(listingsTable).values(listing).onConflictDoUpdate({
        target: listingsTable.id,
        set: listingWithoutId
      });
      // Insert listing event
      await trx.insert(listingEventsTable).values({
        id: eventData.id,
        event: eventData.event,
        listingId: listingData.id,
      });
    });
    console.log('Transaction committed successfully.');
  } catch (error) {
    console.error('Transaction failed:', error);
  }
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log("WebSocket connected");
  });

  ws.on('message', async (data) => {
    const d = JSON.parse(data.toString()) as BPTFListingEvent[];
    for (const e of d) {
      // await db.insert(listingEventsTable)
      //   .values({
      //     id: e.id,
      //     event: e.event,
      //   });

      await addDependenciesInTransaction(e, e.payload);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      connectWebSocket();
    }, 5000);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    ws?.close();
  });
}

async function main() {
  console.log('Clearing listing events table...');
  // await db.delete(listingEventsTable);
  await db.execute(sql`TRUNCATE TABLE ${listingEventsTable} RESTART IDENTITY;`);
  console.log('Listing Events cleared.');
  console.log('Clearing listings...');
  // await db.delete(listingsTable);
  await db.execute(sql`TRUNCATE TABLE ${listingsTable} RESTART IDENTITY CASCADE;`);
  console.log('Listings cleared.');
  
  // await db.delete(itemsTable);

  console.log('Tables cleared.');
  console.log('Connecting to WebSocket...');
  
  connectWebSocket();
}

main();

const app = new Hono()
app.get('/', (c) => c.text('Hello Bun!'))

export default app