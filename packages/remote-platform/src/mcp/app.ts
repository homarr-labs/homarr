import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import type { GlobalMcpOptions } from "./types";
import { globalOAuthRoutes } from "./oauth";
import { globalApprovalRoutes } from "./approvals";
import { GlobalMcpGateway } from "./gateway";

export function createGlobalMcpRoutes(options: GlobalMcpOptions) {
  const base = options.publicUrl.replace(/\/$/, "");
  const app = new Hono<{ Bindings: { clientAddress?: string } }>();
  app.use("*", bodyLimit({ maxSize: 16_384 }));
  const now = options.now ?? Date.now;
  const buckets = new Map<string, { count: number; until: number }>();
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
    const pathname = new URL(c.req.url).pathname;
    const relative = pathname.slice(new URL(base).pathname.replace(/\/$/, "").length);
    if (relative === "/mcp" || relative.startsWith("/mcp/oauth/") || relative.startsWith("/.well-known/")) {
      c.header("Access-Control-Allow-Origin", "*");
      c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      c.header(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Method, Mcp-Name, Last-Event-ID, Mcp-Session-Id",
      );
      c.header("Access-Control-Expose-Headers", "WWW-Authenticate, Mcp-Session-Id");
      if (c.req.method === "OPTIONS") return c.body(null, 204);
    }
    if (c.req.path.includes("/mcp") || c.req.path.includes("/.well-known/")) {
      const key = c.env?.clientAddress ?? "unknown";
      let bucket = buckets.get(key);
      if (!bucket || bucket.until <= now()) {
        bucket = { count: 0, until: now() + 60_000 };
        buckets.set(key, bucket);
      }
      bucket.count++;
      if (buckets.size > 4096) {
        for (const [id, item] of buckets) if (item.until <= now()) buckets.delete(id);
        if (buckets.size > 4096) throw new HTTPException(429, { message: "MCP request capacity reached" });
      }
      if (bucket.count > 120) throw new HTTPException(429, { message: "Too many MCP requests" });
    }
    await next();
  });
  app.route("/", globalOAuthRoutes(options));
  app.route("/", globalApprovalRoutes(options));
  const gateway = new GlobalMcpGateway(options);
  app.all("/mcp", async (c) => {
    const header = c.req.header("Authorization");
    const raw = header?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!raw)
      return c.json({ error: "invalid_token" }, 401, {
        "WWW-Authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/mcp", scope="mcp:tools"`,
      });
    try {
      return await gateway.handle(c.req.raw, raw);
    } catch (error) {
      if (error instanceof HTTPException) {
        if (error.status === 401)
          c.header(
            "WWW-Authenticate",
            `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/mcp", scope="mcp:tools"`,
          );
        return c.json({ error: error.message }, error.status);
      }
      throw error;
    }
  });
  app.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return c.json({ error: "Invalid JSON" }, 400);
    return c.json({ error: "MCP request failed" }, 500);
  });
  return app;
}

export function createGlobalMcpApp(options: GlobalMcpOptions) {
  const basePath = new URL(options.publicUrl).pathname.replace(/\/$/, "");
  const app = new Hono<{ Bindings: { clientAddress?: string } }>();
  const routes = createGlobalMcpRoutes(options);
  app.route(basePath || "/", routes);
  const issuerPath = `${basePath}/mcp`;
  app.get(`/.well-known/oauth-authorization-server${issuerPath}`, (c) =>
    c.redirect(`${options.publicUrl.replace(/\/$/, "")}/.well-known/oauth-authorization-server`),
  );
  app.get(`/.well-known/oauth-protected-resource${issuerPath}`, (c) =>
    c.redirect(`${options.publicUrl.replace(/\/$/, "")}/.well-known/oauth-protected-resource/mcp`),
  );
  return app;
}
