import { z } from "zod";

import type { StatsAuthenticationContext, StatsProvider } from "../types";

const speedSchema = z.number().finite().nonnegative();

const speedtestSchema = z
  .object({
    ping: speedSchema,
    download: speedSchema,
    upload: speedSchema,
  })
  .passthrough();

const speedtestsSchema = z.array(speedtestSchema);

const megabitsToBytesPerSecond = (value: number | undefined) => {
  if (value == null) return null;
  return value * 125_000;
};

const getHttpAuthentication = (context: StatsAuthenticationContext) => {
  const headers: Record<string, string> = {};
  if (context.hasSecret("password")) headers.Password = context.secret("password");
  return { headers };
};

export const myspeedStatsProvider = {
  getHttpAuthentication,
  metrics: [
    { key: "ping", label: "Ping", unit: "milliseconds" },
    { key: "download", label: "Download", unit: "bytesPerSecond" },
    { key: "upload", label: "Upload", unit: "bytesPerSecond" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/speedtests?limit=1", {
      headers: getHttpAuthentication(context).headers,
      signal: context.signal,
    });
    const speedtests = speedtestsSchema.parse(response);
    const latest = speedtests[0];

    return {
      ping: latest?.ping ?? null,
      download: megabitsToBytesPerSecond(latest?.download),
      upload: megabitsToBytesPerSecond(latest?.upload),
    };
  },
} satisfies StatsProvider;
