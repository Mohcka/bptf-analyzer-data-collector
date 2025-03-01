import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Create a single Hono instance for the entire app
const app = new Hono();

// Apply middleware
app.use("*", logger());
app.use("*", cors({
  origin: ["http://localhost:3000", "https://your-production-domain.com"],
  allowMethods: ["GET", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

export default app;
