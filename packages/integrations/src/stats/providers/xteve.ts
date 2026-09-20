import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().nonnegative();

const statsResponseSchema = z
  .object({
    status: z.literal(true),
    // xTeVe omits zero-valued fields because its Go response uses `omitempty`.
    "streams.all": countSchema.optional().default(0),
    "streams.active": countSchema.optional().default(0),
    "streams.xepg": countSchema.optional().default(0),
  })
  .passthrough();

const loginResponseSchema = z
  .object({
    status: z.literal(true),
    token: z.string().min(1),
  })
  .passthrough();

export const xteveStatsProvider = {
  metrics: [
    { key: "streamsAll", label: "All streams", unit: "count" },
    { key: "streamsActive", label: "Active streams", unit: "count" },
    { key: "streamsXepg", label: "XEPG streams", unit: "count" },
  ],
  async fetchAsync(context) {
    const init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: context.signal,
    } as const;

    let payload: { cmd: "status"; token?: string } = { cmd: "status" };
    if (context.hasSecret("username") && context.hasSecret("password")) {
      const loginResponse = await context.requestAsync("/api/", {
        ...init,
        body: JSON.stringify({
          cmd: "login",
          username: context.secret("username"),
          password: context.secret("password"),
        }),
      });
      const login = loginResponseSchema.parse(loginResponse);
      payload = { cmd: "status", token: login.token };
    }

    const response = await context.requestAsync("/api/", {
      ...init,
      body: JSON.stringify(payload),
    });
    const stats = statsResponseSchema.parse(response);

    return {
      streamsAll: stats["streams.all"],
      streamsActive: stats["streams.active"],
      streamsXepg: stats["streams.xepg"],
    };
  },
} satisfies StatsProvider;
