import z from "zod/v4";

import type { SampleHistoryResources } from "./sample-history-store";
import { SampleHistoryStore } from "./sample-history-store";

export const dashdotCpuSampleSchema = z.array(z.object({ load: z.number().min(0), temp: z.number().min(0) }));
export const opnsenseInterfaceSampleSchema = z.array(
  z.object({
    name: z.string(),
    receive: z.custom<number>((value) => typeof value === "number"),
    transmit: z.custom<number>((value) => typeof value === "number"),
  }),
);

export type DashdotCpuSample = z.infer<typeof dashdotCpuSampleSchema>;
export type OpnsenseInterfaceSample = z.infer<typeof opnsenseInterfaceSampleSchema>;

export const createDashdotCpuHistory = (
  integrationId: string,
  resources: Omit<SampleHistoryResources<DashdotCpuSample>, "parseData">,
) =>
  new SampleHistoryStore(
    `integration:${integrationId}:history:cpu`,
    {
      ...resources,
      parseData: (data) => dashdotCpuSampleSchema.parse(data),
    },
    100,
  );

export const createOpnsenseInterfaceHistory = (
  integrationId: string,
  resources: Omit<SampleHistoryResources<OpnsenseInterfaceSample>, "parseData">,
) =>
  new SampleHistoryStore(
    `integration:${integrationId}:interfaces`,
    {
      ...resources,
      parseData: (data) => opnsenseInterfaceSampleSchema.parse(data),
    },
    15,
  );

export const getDashdotLoadAveragesAsync = async (
  history: SampleHistoryStore<DashdotCpuSample>,
  now: Date,
  signal: AbortSignal,
) => {
  const samples = await history.getSliceUntilTimeAsync(new Date(now.getTime() - 15 * 60_000), signal);
  return {
    "1min": Math.round(averageCpuSample(samples[0])),
    "5min": Math.round(averageCpuWindow(samples.slice(0, 4))),
    "15min": Math.round(averageCpuWindow(samples.slice(0, 14))),
  };
};

const averageCpuSample = (sample?: DashdotCpuSample) => {
  if (!sample) return 0;
  return sample.reduce((total, core) => total + core.load, 0) / sample.length;
};

const averageCpuWindow = (window: DashdotCpuSample[]) =>
  window.reduce((total, sample) => total + averageCpuSample(sample), 0) / window.length;
