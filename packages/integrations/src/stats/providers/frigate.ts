import { z } from "zod";

import { RequestError, ResponseError } from "@homarr/common/server";
import { FrigateAuthenticationError } from "../frigate-authentication-error";
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
    } catch (error) {
      if (
        error instanceof RequestError ||
        error instanceof ResponseError ||
        error instanceof FrigateAuthenticationError
      ) {
        throw error;
      }
      throw new Error("Frigate stats request failed");
    }
  },
} satisfies StatsProvider;

async function getHttpAuthenticationAsync(context: StatsFetchContext) {
  if (context.url.protocol !== "https:") {
    throw new Error("Frigate authentication requires an HTTPS integration URL to protect credentials");
  }
  const username = context.secret("username");
  const password = context.secret("password");
  if (!username || !password) throw new Error("Frigate username and password are required");
  const response = await context.requestResponseAsync("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: username, password }),
    signal: context.signal,
  });
  const cookies = response.headers.getSetCookie().filter((cookie) => cookie.startsWith("frigate_token="));
  if (cookies.length !== 1) {
    throw new FrigateAuthenticationError(context.integration, "cookie");
  }
  const token = cookies[0]?.split(";", 1)[0]?.slice("frigate_token=".length);
  if (!token || token.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new FrigateAuthenticationError(context.integration, "cookie");
  }
  const headers = { Authorization: `Bearer ${token}` };
  const profile: unknown = await context.requestAsync("/api/profile", { headers, signal: context.signal });
  const parsed = z
    .object({ username: z.literal(username), role: z.literal("admin"), allowed_cameras: z.array(z.string()) })
    .safeParse(profile);
  if (!parsed.success) {
    throw new FrigateAuthenticationError(context.integration, "profileMismatch");
  }
  return { headers, redactValues: [token] };
}
