import { z } from "zod";

import type { StatsProvider } from "../types";

const checkSchema = z
  .object({
    status: z.enum(["new", "up", "grace", "down", "paused"]),
  })
  .passthrough();

const checksResponseSchema = z
  .object({
    checks: z.array(checkSchema),
  })
  .passthrough();

const countSchema = z.number().finite().int().nonnegative();

export const healthchecksStatsProvider = {
  metrics: [
    { key: "checksUp", label: "Up checks", unit: "count" },
    { key: "checksDown", label: "Down checks", unit: "count" },
    { key: "checksGrace", label: "Checks in grace", unit: "count" },
    { key: "checksNew", label: "New checks", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/v3/checks/", {
      headers: { "X-Api-Key": context.secret("apiKey") },
      signal: context.signal,
    });
    const checks = checksResponseSchema.parse(response).checks;

    return {
      checksUp: countSchema.parse(checks.filter((check) => check.status === "up").length),
      checksDown: countSchema.parse(checks.filter((check) => check.status === "down").length),
      checksGrace: countSchema.parse(checks.filter((check) => check.status === "grace").length),
      checksNew: countSchema.parse(checks.filter((check) => check.status === "new").length),
    };
  },
} satisfies StatsProvider;
