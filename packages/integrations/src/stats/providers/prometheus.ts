import { z } from "zod";

import type { StatsProvider } from "../types";

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

export const prometheusStatsProvider = {
  metrics: [
    { key: "total", label: "Targets", unit: "count" },
    { key: "up", label: "Up", unit: "count" },
    { key: "down", label: "Down", unit: "count" },
  ],
  async fetchAsync(context) {
    const headers: Record<string, string> = {};
    if (context.hasSecret("username") && context.hasSecret("password")) {
      headers.Authorization = `Basic ${Buffer.from(`${context.secret("username")}:${context.secret("password")}`, "utf8").toString("base64")}`;
    }

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
