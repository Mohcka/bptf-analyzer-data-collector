import { Hono } from 'hono';
import { setupTrendingRoutes } from './routes/trending';

// Export a function to setup all routes
export function setupRoutes(app: Hono) {
  // Setup basic routes
  app.get('/hello', (c) => c.text('Hello Bun!'));
  
  // Setup feature-specific routes
  setupTrendingRoutes(app);
  
  // Add more routes as needed here
  
  return app;
}
