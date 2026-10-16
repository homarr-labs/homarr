import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { serveStatic } from "hono/bun";

import { createRemotePlatformApp } from "./app";
import { pocketBaseWorkshopAuth } from "./auth";
import { PlatformStore } from "./store";
import { McpServiceStore } from "./mcp/store";

const path = process.env.REMOTE_PLATFORM_DB ?? "./data/platform.sqlite";
mkdirSync(dirname(path), { recursive: true });
const store = new PlatformStore(path);
const mcpPath = process.env.REMOTE_MCP_DB ?? resolve(dirname(path), "mcp.sqlite");
const mcpSecrets = new McpServiceStore({
  path: mcpPath,
  keyFile: process.env.REMOTE_BROKER_KEY_FILE ?? resolve(dirname(mcpPath), "broker.key"),
});
const app = createRemotePlatformApp({
  store,
  publicUrl: process.env.REMOTE_PUBLIC_URL ?? "http://localhost:3104/remote",
  auth: pocketBaseWorkshopAuth({ apiUrl: process.env.WORKSHOP_API_URL ?? "https://homarr.dev" }),
  mcp: {
    secrets: mcpSecrets,
    allowedRelayUrls: process.env.REMOTE_MCP_RELAY_URLS?.split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    relayConnectUrl: process.env.REMOTE_MCP_RELAY_CONNECT_URL,
  },
});
const frontendDir = process.env.REMOTE_FRONTEND_DIR;
if (frontendDir) {
  const root = resolve(frontendDir);
  const basePath = new URL(process.env.REMOTE_PUBLIC_URL ?? "http://localhost:3104/remote").pathname.replace(/\/$/, "");
  app.get("*", serveStatic({ root, rewriteRequestPath: (requestPath) => requestPath.slice(basePath.length) || "/" }));
  app.get("*", async (c) => {
    const shell = Bun.file(resolve(root, "_shell.html"));
    if (!(await shell.exists())) return c.json({ error: "Frontend shell is missing" }, 503);
    c.header("Content-Type", "text/html; charset=utf-8");
    return c.body(await shell.text());
  });
}
const cleanup = setInterval(() => {
  store.cleanup(Date.now());
  mcpSecrets.cleanup(Date.now());
}, 60_000);
cleanup.unref();
const server = Bun.serve({
  hostname: process.env.HOSTNAME ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3104),
  maxRequestBodySize: 16_384,
  fetch(request, runtime) {
    return app.fetch(request, { clientAddress: runtime.requestIP(request)?.address });
  },
});
console.log(`Homarr remote platform listening on ${server.url.origin}`);
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    clearInterval(cleanup);
    server.stop(true);
    mcpSecrets.close();
    store.close();
    process.exit(0);
  });
}
