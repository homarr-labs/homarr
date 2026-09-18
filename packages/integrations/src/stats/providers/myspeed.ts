import { z } from "zod";

import type { StatsProvider } from "../types";

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

export const myspeedStatsProvider = {
  metrics: [
    { key: "ping", label: "Ping", unit: "milliseconds" },
    { key: "download", label: "Download", unit: "bytesPerSecond" },
    { key: "upload", label: "Upload", unit: "bytesPerSecond" },
  ],
  async fetchAsync(context) {
    const init = { signal: context.signal };
    if (context.hasSecret("password")) {
      Object.assign(init, { headers: { Password: context.secret("password") } });
    }
    const response = await context.requestAsync("/api/speedtests?limit=1", init);
    const speedtests = speedtestsSchema.parse(response);
    const latest = speedtests[0];

    return {
      ping: latest?.ping ?? null,
      download: megabitsToBytesPerSecond(latest?.download),
      upload: megabitsToBytesPerSecond(latest?.upload),
    };
  },
} satisfies StatsProvider;
