import { Hono } from "hono";

import { createLogger } from "@homarr/core/infrastructure/logs";

import { backendCors } from "./cors";
import { assistantRoutes } from "./routes/assistant";
import { authRoutes } from "./routes/auth";
import { mcpRoutes } from "./routes/mcp";
import { resourcesRoutes } from "./routes/resources";
import { registerRpcRoutes } from "./routes/rpc";

const logger = createLogger({ module: "backend" });

export function createBackendApp(options: { isReady?: () => boolean } = {}) {
  const app = new Hono();

  app.use("*", backendCors);

  app.use("/api/health/ready", async (context, next) => {
    if (options.isReady && !options.isReady()) {
      return context.json({ status: "starting" }, 503);
    }
    await next();
  });

  app.route("/api/auth", authRoutes);
  app.route("/", mcpRoutes);
  app.route("/", assistantRoutes);
  app.route("/", resourcesRoutes);
  // The old dashboard may opt into this transport during migration. It is
  // never imported by the independently built encrypted worker.
  if (process.env.BACKEND_LEGACY_TRPC === "true") {
    app.all("/api/trpc/*", async (context) => {
      const { handleLegacyRpcAsync } = await import("./routes/legacy");
      return await handleLegacyRpcAsync(context.req.raw);
    });
  }
  registerRpcRoutes(app);

  app.onError((error, context) => {
    logger.error(error);
    return context.json({ error: "Internal server error" }, 500);
  });

  return app;
}

export const app = createBackendApp();
export default app;
