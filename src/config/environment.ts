export const config = {
  // WebSocket
  WS_URL: 'wss://ws.backpack.tf/events',
  WS_RECONNECT_TIMEOUT_MS: 5000,

  // Data retention
  RETENTION_HOURS: parseInt(process.env.RETENTION_HOURS || '1', 10),
  CLEANUP_INTERVAL_MINUTES: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '15', 10),

  // Database
  DASHBOARD_DB_USERNAME: process.env.DASHBOARD_DB_USERNAME,
  DASHBOARD_DB_PASSWORD: process.env.DASHBOARD_DB_PASSWORD,
  POSTGRES_DB: process.env.POSTGRES_DB || 'postgres',
};
