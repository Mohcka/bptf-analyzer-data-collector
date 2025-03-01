import app from "./app";
import { setupRoutes } from "./routes";

// Root endpoint
app.get("/", (c) => {
  return c.json({
    message: "BPTF Analyzer API",
    version: "1.0.0"
  });
});

// Setup all routes using the main app instance
setupRoutes(app);

export default app;
