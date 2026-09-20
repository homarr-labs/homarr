import { z } from "zod";

import type { StatsAuthenticationContext, StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();

const targetsResponseSchema = z
  .object({
    status: z.literal("success"),
    data: z
      .object({
        activeTargets: z.array(
          z
            .object({
              health: z.string(),
            })
            .passthrough(),
        ),
        droppedTargets: z.array(z.unknown()),
      })
      .passthrough(),
  })
  .passthrough();

const getHttpAuthentication = (context: StatsAuthenticationContext) => {
  const headers: Record<string, string> = {};
  if (context.hasSecret("username") && context.hasSecret("password")) {
    headers.Authorization = `Basic ${Buffer.from(`${context.secret("username")}:${context.secret("password")}`, "utf8").toString("base64")}`;
  }

  return { headers };
};

export const prometheusStatsProvider = {
  getHttpAuthentication,
  metrics: [
    { key: "total", label: "Targets", unit: "count" },
    { key: "up", label: "Up", unit: "count" },
    { key: "down", label: "Down", unit: "count" },
  ],
  async fetchAsync(context) {
    const { headers } = getHttpAuthentication(context);

    const response = await context.requestAsync("/api/v1/targets", {
      headers,
      signal: context.signal,
    });
    const targets = targetsResponseSchema.parse(response).data.activeTargets;

    return {
      total: countSchema.parse(targets.length),
      up: countSchema.parse(targets.filter((target) => target.health === "up").length),
      down: countSchema.parse(targets.filter((target) => target.health === "down").length),
    };
  },
} satisfies StatsProvider;
