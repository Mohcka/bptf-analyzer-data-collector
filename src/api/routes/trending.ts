import { Hono } from "hono";
import fs from "fs/promises";
import path from "path";

const TRENDING_FILE = path.join(process.cwd(), "data", "trending-items.json");

// Export a function that adds routes to the existing app
export function setupTrendingRoutes(app: Hono) {
  app.get("/trending", async (c) => {
    try {
      // Read the trending data from the JSON file
      const fileData = await fs.readFile(TRENDING_FILE, "utf-8");
      const trendingData = JSON.parse(fileData);
      
      // Set cache control headers (optional)
      c.header("Cache-Control", "public, max-age=60"); // 1 minute cache
      
      return c.json(trendingData);
    } catch (error: unknown) {
      console.error("Failed to read trending data:", error);
      
      if (error instanceof Error && 'code' in error && error.code === "ENOENT") {
        return c.json({ error: "Trending data not yet available" }, 404);
      }
      
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return app;
}
