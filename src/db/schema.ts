import { pgTable, text, integer, boolean, timestamp, json, decimal, unique, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { real } from 'drizzle-orm/mysql-core';

export const listingCreationStatusEnum = pgEnum('listing_creation_status', ['listing-update', 'listing-delete']);

// // Users table
// export const usersTable = pgTable('users', {
//   id: text('id').primaryKey(), // steamid
//   name: text('name').notNull(),
//   avatar: text('avatar'),
//   avatarFull: text('avatar_full'),
//   premium: boolean('premium').default(false),
//   online: boolean('online').default(false),
//   banned: boolean('banned').default(false),
//   customNameStyle: text('custom_name_style'),
//   acceptedSuggestions: integer('accepted_suggestions').default(0),
//   class: text('class'),
//   style: text('style'),
//   role: text('role'),
//   tradeOfferUrl: text('trade_offer_url'),
//   isMarketplaceSeller: boolean('is_marketplace_seller').default(false),
//   flagImpersonated: boolean('flag_impersonated'),
// });

// // Quality table
// export const qualities = pgTable('qualities', {
//   id: integer('id').primaryKey(),
//   name: text('name').notNull(),
//   color: text('color').notNull(),
// });

// // Particles table
// export const particles = pgTable('particles', {
//   id: integer('id').primaryKey(),
//   name: text('name').notNull(),
//   shortName: text('short_name'),
//   imageUrl: text('image_url'),
//   type: text('type'),
// });

// // Items table
// export const itemsTable = pgTable('items', {
//   id: text('id').primaryKey(),
//   appid: integer('appid').notNull(),
//   baseName: text('base_name').notNull(),
//   defindex: integer('defindex').notNull(),
//   imageUrl: text('image_url'),
//   marketName: text('market_name'),
//   name: text('name'),
//   origin: integer('origin'),
//   originalId: text('original_id'),
//   summary: text('summary'),
//   // slot: text('slot'),
//   tradable: boolean('tradable'),
//   craftable: boolean('craftable'),
//   priceindex: text('price_index'),
//   // qualityId: integer('quality_id').references(() => qualities.id),
//   // particleId: integer('particle_id').references(() => particles.id),
// });

// // Prices table
// export const prices = pgTable('prices', {
//   id: text('id').primaryKey(),
//   itemId: text('item_id').references(() => items.id),
//   steamCurrency: text('steam_currency'),
//   steamShort: text('steam_short'),
//   steamLong: text('steam_long'),
//   steamRaw: decimal('steam_raw'),
//   steamValue: integer('steam_value'),
//   communityValue: decimal('community_value'),
//   communityValueHigh: decimal('community_value_high'),
//   communityCurrency: text('community_currency'),
//   communityRaw: decimal('community_raw'),
//   communityShort: text('community_short'),
//   communityLong: text('community_long'),
//   communityUsd: decimal('community_usd'),
//   communityUpdatedAt: timestamp('community_updated_at'),
//   communityDifference: decimal('community_difference'),
//   suggestedRaw: decimal('suggested_raw'),
//   suggestedShort: text('suggested_short'),
//   suggestedLong: text('suggested_long'),
//   suggestedUsd: decimal('suggested_usd'),
// });

// Listings table
export const listingsTable = pgTable('listings', {
  id: text('id').primaryKey(),
  // userId: text('user_id').references(() => usersTable.id),
  // itemId: text('item_id').references(() => itemsTable.id),
  // itemId: text('item_id'),
  appid: integer('appid'),
  metalAmount: decimal('metal_amount'),
  keysAmount: integer('keys_amount'),
  valueRaw: decimal('value_raw'),
  valueShort: text('value_short'),
  valueLong: text('value_long'),
  tradeOffersPreferred: boolean('trade_offers_preferred'),
  buyoutOnly: boolean('buyout_only'),
  details: text('details'),
  listedAt: timestamp('listed_at'),
  bumpedAt: timestamp('bumped_at'),
  intent: text('intent'),
  count: integer('count'),
  status: text('status'),
  source: text('source'),
  userAgentClient: text('user_agent_client'),
  userAgentLastPulse: timestamp('user_agent_last_pulse'),
  creationStatus: listingCreationStatusEnum(),

  // user
  userSteamId: text('steam_id').notNull(),
  username: text('name').notNull(),
  userAvatar: text('user_avatar').notNull(),
  userAvatarFull: text('user_avatar_full').notNull(),
  userBanned: boolean('user_banned').notNull(),

  // item
  itemBaseName: text('base_name').notNull(),
  itemImageUrL: text('image_url').notNull(),
  itemMarketName: text('market_name').notNull(),
  itemName: text('item_name').notNull(),
  itemPriceValue: decimal('price_value'),
  itemPriceValueHigh: text('price_value_high'),
  itemCurrency: text('currency'),
  itemPriceShort: text('price_short'),
  itemPriceLong: text('price_long'),
  itemPriceUsd: text('price_usd'),
  itemSummary: text('summary').notNull(),
  itemClass: text('class').array(),
  itemSlot: text('slot')
});

// Listing Events table
export const listingEventsTable = pgTable('listing_events', {
  id: text('id').primaryKey(),
  event: text('event').notNull(),
  listingId: text('listing_id').references(() => listingsTable.id),
  // payload: json('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
// export const userRelations = relations(users, ({ many }) => ({
//   listings: many(listings),
// }));

// export const itemRelations = relations(items, ({ one }) => ({
//   quality: one(qualities, {
//     fields: [items.qualityId],
//     references: [qualities.id],
//   }),
//   particle: one(particles, {
//     fields: [items.particleId],
//     references: [particles.id],
//   }),
// }));

// export const listingRelations = relations(listings, ({ one, many }) => ({
//   user: one(users, {
//     fields: [listings.userId],
//     references: [users.id],
//   }),
//   item: one(items, {
//     fields: [listings.itemId],
//     references: [items.id],
//   }),
//   events: many(listingEvents),
// }));

// export const listingEventRelations = relations(listingEvents, ({ one }) => ({
//   listing: one(listings, {
//     fields: [listingEvents.listingId],
//     references: [listings.id],
//   }),
// }));
