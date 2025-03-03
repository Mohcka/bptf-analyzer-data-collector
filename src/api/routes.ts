import { Hono } from 'hono';
import { setupTrendingRoutes } from '@/api/routes/trending';
import { setupItemActivityRoutes } from "./routes/trending-v2";

// Export a function to setup all routes
export function setupRoutes(app: Hono) {
  // Setup basic routes
  app.get('/hello', (c) => c.text('Hello Bun!'));
  
  // Setup feature-specific routes
  setupTrendingRoutes(app);
  setupItemActivityRoutes(app);
  
  // Add more routes as needed here
  
  return app;
}
