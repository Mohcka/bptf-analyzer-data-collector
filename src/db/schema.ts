import { pgTable, text, integer, boolean, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const listingCreationStatusEnum = pgEnum('listing_creation_status', ['listing-update', 'listing-delete']);

// Listing Events table
export const listingEventsTable = pgTable('listing_events', {
  // Event metadata
  id: text('id').primaryKey(),
  event: text('event').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  listingId: text('listing_id').notNull(),

  // Currencies interface fields
  metalAmount: decimal('metal_amount'),
  keysAmount: decimal('keys_amount'),

  // Value interface fields
  valueRaw: decimal('value_raw'),
  valueShort: text('value_short'),
  valueLong: text('value_long'),

  // Price interface fields
  // -- Steam pricing
  itemSteamCurrency: text('item_steam_currency'),
  itemSteamShort: text('item_steam_short'),
  itemSteamLong: text('item_steam_long'),
  itemSteamRaw: decimal('item_steam_raw'),
  itemSteamValue: decimal('item_steam_value'),
  // -- Community pricing
  itemPriceValue: decimal('price_value'),
  itemPriceValueHigh: decimal('price_value_high'),
  itemCurrency: text('currency'),
  itemPriceShort: text('price_short'),
  itemPriceLong: text('price_long'),
  itemPriceUsd: decimal('price_usd'),

  // Item interface fields
  itemBaseName: text('base_name').notNull(),
  itemImageUrL: text('image_url').notNull(),
  itemMarketName: text('market_name').notNull(),
  itemName: text('item_name').notNull(),
  itemSummary: text('summary').notNull(),
  itemClass: text('class').array(),
  itemSlot: text('slot'),
  itemTradable: boolean('item_tradable'),
  itemCraftable: boolean('item_craftable'),
  itemQualityName: text('item_quality_name'),
  itemQualityColor: text('item_quality_color'),

  // UserAgent interface fields
  userAgentClient: text('user_agent_client'),
  userAgentLastPulse: timestamp('user_agent_last_pulse'),

  // User interface fields
  userSteamId: text('steam_id').notNull(),
  username: text('name').notNull(),
  userAvatar: text('user_avatar').notNull(),
  userAvatarFull: text('user_avatar_full').notNull(),
  userBanned: boolean('user_banned').notNull(),
  userPremium: boolean('user_premium'),
  userOnline: boolean('user_online'),
  userCustomNameStyle: text('user_custom_name_style'),
  userAcceptedSuggestions: integer('user_accepted_suggestions'),
  userStyle: text('user_style'),
  userRole: text('user_role'),
  userTradeOfferUrl: text('user_trade_offer_url'),
  userIsMarketplaceSeller: boolean('user_is_marketplace_seller'),
  userBans: text('user_bans').array(),

  // ListingPayload specific fields
  appid: integer('appid'),
  tradeOffersPreferred: boolean('trade_offers_preferred'),
  buyoutOnly: boolean('buyout_only'),
  details: text('details'),
  listedAt: timestamp('listed_at'),
  bumpedAt: timestamp('bumped_at'),
  intent: text('intent'),
  count: integer('count'),
  status: text('status'),
  source: text('source'),
  creationStatus: listingCreationStatusEnum('creation_status'),
});
