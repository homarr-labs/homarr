import { z } from "zod/v4";

const capabilityValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]).catch(null);

export const homeyCapabilitySchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().nullish(),
  value: capabilityValueSchema.optional(),
  units: z.string().nullish(),
  getable: z.boolean().optional(),
  setable: z.boolean().optional(),
  min: z.number().nullish(),
  max: z.number().nullish(),
  step: z.number().nullish(),
  values: z.array(z.object({ id: z.string(), title: z.string().nullish() })).nullish(),
  maintenanceAction: z.boolean().optional(),
  lastUpdated: z.union([z.number(), z.string()]).nullish(),
});

export type HomeyCapability = z.infer<typeof homeyCapabilitySchema>;

export const homeyDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  zone: z.string().nullish(),
  class: z.string(),
  virtualClass: z.string().nullish(),
  // The app the device comes from, e.g. `homey:app:com.amazon.alexa`.
  driverUri: z.string().nullish(),
  capabilitiesObj: z.record(z.string(), homeyCapabilitySchema).nullish(),
  available: z.boolean().optional(),
  hidden: z.boolean().optional(),
  // Camera pictures and live videos. Unexpected shapes are dropped instead of failing the whole device.
  images: z
    .array(
      z.object({
        type: z.string().nullish(),
        imageObj: z.object({ id: z.string(), url: z.string().nullish(), lastUpdated: z.number().nullish() }).nullish(),
      }),
    )
    .nullish()
    .catch(null),
  videos: z
    .array(
      z.object({
        type: z.string().nullish(),
        videoObj: z.object({ id: z.string(), type: z.string().nullish() }).nullish(),
      }),
    )
    .nullish()
    .catch(null),
});

export type HomeyDevice = z.infer<typeof homeyDeviceSchema>;

export const homeyDevicesSchema = z.record(z.string(), homeyDeviceSchema);

export const homeyZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string().nullish(),
  icon: z.string().nullish(),
});

export type HomeyZone = z.infer<typeof homeyZoneSchema>;

export const homeyZonesSchema = z.record(z.string(), homeyZoneSchema);

export const homeyFlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().optional(),
  triggerable: z.boolean().optional(),
  broken: z.boolean().optional(),
});

export type HomeyFlow = z.infer<typeof homeyFlowSchema> & { advanced: boolean };

export const homeyFlowsSchema = z.record(z.string(), homeyFlowSchema);

const wattsSchema = z.object({ W: z.number().nullish() }).nullish();

export const homeyEnergyLiveSchema = z.object({ totalConsumed: wattsSchema, totalGenerated: wattsSchema });

export const homeyEnergyDaySchema = z.object({
  electricity: z.object({ consumedPeriod: z.number().nullish(), generatedPeriod: z.number().nullish() }).nullish(),
});

export const homeySystemSchema = z.object({
  homeyVersion: z.string().nullish(),
  uptime: z.number().nullish(),
  totalmem: z.number().nullish(),
  freemem: z.number().nullish(),
  loadavg: z.array(z.number()).nullish(),
  cpus: z.array(z.unknown()).nullish(),
  videoCoreTemperature: z.number().nullish(),
});

export const homeyInsightsEntriesSchema = z.object({
  values: z.array(z.object({ t: z.string(), v: z.union([z.number(), z.boolean(), z.null()]) })),
});
