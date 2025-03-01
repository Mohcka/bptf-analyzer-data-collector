/** 
 * Represents Team Fortress 2 trading currencies
 * @example
 * {
 *   "metal": 8.88,
 *   "keys": 3
 * }
 */
interface Currencies {
  /** Amount of refined metal (e.g., 8.88) */
  metal?: number;
  /** Number of Mann Co. Supply Crate Keys (e.g., 3) */
  keys?: number;
}

/** 
 * Represents a trading value in multiple formats
 * @example
 * {
 *   "raw": 211.2,
 *   "short": "3.13 keys",
 *   "long": "3 keys, 8.88 ref"
 * }
 */
interface Value {
  /** Raw numerical value in refined metal */
  raw: number;
  /** Shortened display format */
  short: string;
  /** Full display format */
  long: string;
}

/** Represents currency values in TF2 trading */
interface Price {
  /** Steam Community Market pricing information */
  steam?: {
    /** Currency code (e.g., 'usd') */
    currency: string;
    /** Formatted short price (e.g., '$7.29') */
    short: string;
    /** Detailed price format (e.g., '310.21 ref, 4.60 keys') */
    long: string;
    /** Raw numerical value in refined metal */
    raw: number;
    /** Price value in cents (e.g., 729 for $7.29) */
    value: number;
  };
  /** Backpack.tf community pricing information */
  community?: {
    /** Current price in keys */
    value: number;
    /** Upper price bound in keys */
    valueHigh: number;
    /** Price currency type (usually 'keys') */
    currency: string;
    /** Raw value in refined metal */
    raw: number;
    /** Short price format (e.g., '3 keys') */
    short: string;
    /** Detailed price format (e.g., '202.32 ref, $4.75') */
    long: string;
    /** Price in USD */
    usd: number;
    /** Unix timestamp of last price update */
    updatedAt: number;
    /** Price change from previous value */
    difference: number;
  };
  /** Suggested price information */
  suggested?: {
    /** Raw value in refined metal */
    raw: number;
    /** Short price format */
    short: string;
    /** Detailed price format */
    long: string;
    /** Price in USD */
    usd: number;
  };
}

/**
 * Item quality information
 * @example
 * {
 *   "id": 11,
 *   "name": "Strange",
 *   "color": "#CF6A32"
 * }
 */
interface Quality {
  id: number;
  name: 'Normal' | 'Unique' | 'Vintage' | 'Genuine' | 'Strange' | 'Unusual' | 
       'Haunted' | 'Collector\'s' | 'Decorated' | 'Community' | 'Self-Made' | 'Valve';
  color: '#B2B2B2' | '#FFD700' | '#476291' | '#4D7455' | '#CF6A32' | '#8650AC' | 
         '#38F3AB' | '#AA0000' | '#FAFAFA' | '#70B04A' | '#A50F79';
}

/** 
 * Represents a particle effect for unusual items
 */
interface Particle {
  /** Unique particle effect ID */
  id: number;
  /** Full particle effect name */
  name: string;
  /** Shortened particle effect name */
  shortName: string;
  /** URL to particle effect image */
  imageUrl: string;
  /** Particle effect category */
  type: string;
}

/** TF2 item information */
interface Item {
  /** Steam application ID (440 for TF2) */
  appid: number;
  /** Base item name without attributes */
  baseName: string;
  /** Item definition index */
  defindex: number;
  /** Unique item identifier */
  id: string;
  /** URL to item's icon image */
  imageUrl: string;
  /** Full market name including qualities */
  marketName: string;
  /** Complete item name with attributes */
  name: string;
  /** Item origin ID if applicable */
  origin: null | number;
  /** Original item identifier */
  originalId: string;
  /** Price information object */
  price: Price;
  /** Quality information */
  quality: Quality;
  /** Item description summary */
  summary: string;
  /** Applicable TF2 classes */
  class: string[];
  /** Equipment slot category */
  slot: string;
  /** Whether item can be traded */
  tradable: boolean;
  /** Whether item can be used in crafting */
  craftable: boolean;
  /** Killstreak tier (0-3) if applicable */
  killstreakTier?: number;
  /** Particle effect information for unusual items */
  particle?: Particle;
  /** Price index for priced variations */
  priceindex?: string;
}

/** User agent details for automated trading */
interface UserAgent {
  /** Client application name */
  client: string;
  /** Last heartbeat timestamp */
  lastPulse: number;
}

/** User profile information */
interface User {
  /** Steam ID of the user */
  id: string;
  /** Display name */
  name: string;
  /** Small avatar URL */
  avatar: string;
  /** Full-size avatar URL */
  avatarFull: string;
  /** Premium status on backpack.tf */
  premium: boolean;
  /** Current online status */
  online: boolean;
  /** Account ban status */
  banned: boolean;
  /** Custom name style identifier */
  customNameStyle: string;
  /** Number of accepted price suggestions */
  acceptedSuggestions: number;
  /** User class style */
  class: string;
  /** Visual style preference */
  style: string;
  /** Site role if any */
  role: null | string;
  /** Steam trade offer URL */
  tradeOfferUrl: string;
  /** Marketplace seller status */
  isMarketplaceSeller: boolean;
  /** Impersonation flag status */
  flagImpersonated: null | boolean;
  /** Array of active bans */
  bans: any[];
}

/** Complete listing details */
interface ListingPayload {
  /** Unique listing identifier */
  id: string;
  /** Steam ID of listing creator */
  steamid: string;
  /** Game application ID */
  appid: number;
  /** Trading currencies specified */
  currencies: Currencies;
  /** Listing value information */
  value: Value;
  /** Preference for trade offers */
  tradeOffersPreferred: boolean;
  /** Whether only buyout offers accepted */
  buyoutOnly: boolean;
  /** Listing description text */
  details: string;
  /** Creation timestamp */
  listedAt: number;
  /** Last bump timestamp */
  bumpedAt: number;
  /** Trading intention (buy/sell) */
  intent: 'buy' | 'sell';
  /** Number of items */
  count: number;
  /** Current listing status */
  status: string;
  /** Listing source identifier */
  source: string;
  /** Item details */
  item: Item;
  /** User agent information */
  userAgent: UserAgent;
  /** User profile information */
  user: User;
}

/** Websocket event data */
interface BPTFListingEvent {
  /** Event unique identifier */
  id: string;
  /** Event type */
  event: 'listing-update' | 'listing-delete';
  /** Event data payload */
  payload: ListingPayload;
}