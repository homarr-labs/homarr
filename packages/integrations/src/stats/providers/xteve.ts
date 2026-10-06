import { z } from "zod";

import type { StatsFetchContext, StatsProvider } from "../types";

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

const getLoginTokenAsync = async (context: StatsFetchContext): Promise<string | undefined> => {
  const hasUsername = context.hasSecret("username");
  const hasPassword = context.hasSecret("password");
  if (!hasUsername && !hasPassword) return undefined;
  if (!hasUsername || !hasPassword) throw new Error("xTeVe authentication failed");

  try {
    const loginResponse = await context.requestAsync("/api/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "login",
        username: context.secret("username"),
        password: context.secret("password"),
      }),
      signal: context.signal,
    });
    const login = loginResponseSchema.safeParse(loginResponse);
    if (!login.success) throw new Error("xTeVe authentication failed");
    return login.data.token;
  } catch {
    throw new Error("xTeVe authentication failed");
  }
};

export const xteveStatsProvider = {
  metrics: [
    { key: "streamsAll", label: "All streams", unit: "count" },
    { key: "streamsActive", label: "Active streams", unit: "count" },
    { key: "streamsXepg", label: "XEPG streams", unit: "count" },
  ],
  async getHttpAuthenticationAsync(context: StatsFetchContext) {
    const token = await getLoginTokenAsync(context);
    if (token === undefined) return { headers: {} };
    return {
      headers: {},
      body: { type: "jsonField" as const, name: "token", value: token },
      redactValues: [token],
    };
  },
  async fetchAsync(context) {
    const init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: context.signal,
    } as const;

    const token = await getLoginTokenAsync(context);
    const payload: { cmd: "status"; token?: string } = token ? { cmd: "status", token } : { cmd: "status" };

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
