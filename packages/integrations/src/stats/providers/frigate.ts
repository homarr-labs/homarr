import { z } from "zod";

import type { StatsFetchContext, StatsProvider } from "../types";

const statsSchema = z
  .object({
    cameras: z.record(z.string(), z.unknown()).default({}),
    service: z.object({ uptime: z.number().finite().nonnegative(), version: z.string() }).passthrough(),
  })
  .passthrough();

export const frigateStatsProvider = {
  getHttpAuthenticationAsync,
  metrics: [
    { key: "cameras", label: "Cameras", unit: "count" },
    { key: "uptime", label: "Uptime", unit: "seconds" },
    { key: "version", label: "Version", unit: "text" },
  ],
  async fetchAsync(context) {
    const authentication = await getHttpAuthenticationAsync(context);
    try {
      const stats = statsSchema.parse(
        await context.requestAsync("/api/stats", { headers: authentication.headers, signal: context.signal }),
      );
      return {
        cameras: Object.keys(stats.cameras).length,
        uptime: stats.service.uptime,
        version: stats.service.version,
      };
    } catch {
      throw new Error("Frigate stats request failed");
    }
  },
} satisfies StatsProvider;

async function getHttpAuthenticationAsync(context: StatsFetchContext) {
  try {
    const username = context.secret("username");
    const password = context.secret("password");
    if (!username || !password) throw new Error("Missing credentials");
    const response = await context.requestResponseAsync("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: username, password }),
      signal: context.signal,
    });
    if (response.status !== 200) throw new Error("Login rejected");
    const cookies = response.headers.getSetCookie().filter((cookie) => cookie.startsWith("frigate_token="));
    if (cookies.length !== 1) throw new Error("Missing or ambiguous session cookie");
    const token = cookies[0]?.split(";", 1)[0]?.slice("frigate_token=".length);
    if (!token || token.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
      throw new Error("Invalid session cookie");
    }
    const headers = { Authorization: `Bearer ${token}` };
    z.object({ username: z.literal(username), role: z.literal("admin"), allowed_cameras: z.array(z.string()) }).parse(
      await context.requestAsync("/api/profile", { headers, signal: context.signal }),
    );
    return { headers, redactValues: [token] };
  } catch {
    throw new Error("Frigate authentication failed");
  }
}
