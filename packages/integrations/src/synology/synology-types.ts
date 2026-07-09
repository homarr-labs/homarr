import { z } from "zod";

export const REQUEST_TIMEOUT_MS = 5000;

export const AUTH_API_NAME = "SYNO.API.Auth";
export const INFO_API_NAME = "SYNO.API.Info";

export const SESSION_ERROR_CODES = new Set([106, 107, 119]);

export const synologyEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
    })
    .optional(),
});

export const synologyApiDefinitionSchema = z.object({
  path: z.string(),
  maxVersion: z.number(),
});

export const synologyApiInfoResponseSchema = synologyEnvelopeSchema.extend({
  data: z.record(z.string(), synologyApiDefinitionSchema).optional(),
});

export const synologyAuthResponseSchema = synologyEnvelopeSchema.extend({
  data: z
    .object({
      sid: z.string().optional(),
    })
    .optional(),
});

const numericString = z.union([z.number(), z.string()]);

export const synologySystemInfoDataSchema = z
  .object({
    up_time: z.string().optional(),
    uptime: z.number().optional(),
    version_string: z.string().optional(),
    firmware_ver: z.string().optional(),
    version: z.union([z.string(), z.number()]).optional(),
    model: z.string().optional(),
    sys_temp: numericString.optional(),
    temperature: numericString.optional(),
  })
  .passthrough();

export const synologyVolumeInfoSchema = z.object({
  name: z.string(),
  used_size: numericString.optional(),
  total_size: numericString.optional(),
  status: z.string().optional(),
  vol_path: z.string().optional(),
});

export const synologyLegacyStorageDataSchema = z.object({
  vol_info: z.array(synologyVolumeInfoSchema).optional(),
});

export const synologyStorageV2VolumeSchema = z
  .object({
    id: z.string().optional(),
    vol_path: z.string().optional(),
    display_name: z.string().optional(),
    size: z
      .object({
        total: z.union([z.number(), z.string()]).optional(),
        used: z.union([z.number(), z.string()]).optional(),
      })
      .optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const synologyStorageV2DataSchema = z.object({
  volumes: z.array(synologyStorageV2VolumeSchema).optional(),
});

export const synologyUtilizationCpuSchema = z.object({
  user_load: numericString.optional(),
  system_load: numericString.optional(),
  other_load: numericString.optional(),
  "1min_load": numericString.optional(),
  "5min_load": numericString.optional(),
  "15min_load": numericString.optional(),
});

export const synologyUtilizationMemorySchema = z.object({
  real_usage: numericString.optional(),
  avail_real: numericString.optional(),
  cached: numericString.optional(),
  total_real: numericString.optional(),
});

export const synologyUtilizationNetworkSchema = z.object({
  device: z.string(),
  rx: numericString.optional(),
  tx: numericString.optional(),
});

export const synologyUtilizationDataSchema = z.object({
  cpu: synologyUtilizationCpuSchema.optional(),
  memory: synologyUtilizationMemorySchema.optional(),
  network: z.array(synologyUtilizationNetworkSchema).optional(),
});

export const synologyStorageDiskSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    status: z.string().optional(),
    temp: numericString.optional(),
    temperature: numericString.optional(),
    smart_status: z.string().optional(),
    volume_id: z.string().optional(),
    vol_path: z.string().optional(),
  })
  .passthrough();

export const synologyStorageLoadInfoDataSchema = z
  .object({
    disks: z.array(synologyStorageDiskSchema).optional(),
    volumes: z.array(synologyStorageV2VolumeSchema).optional(),
    overview_data: z
      .object({
        volumes: z.array(synologyVolumeInfoSchema).optional(),
      })
      .optional(),
  })
  .passthrough();

export const synologySmartDiskSchema = z
  .object({
    id: z.string().optional(),
    disk_id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    temp: numericString.optional(),
    temperature: numericString.optional(),
    overall_status: z.string().optional(),
  })
  .passthrough();

export const synologySmartInfoDataSchema = z
  .object({
    disks: z.array(synologySmartDiskSchema).optional(),
    items: z.array(synologySmartDiskSchema).optional(),
  })
  .passthrough();

export const synologySystemStatusDataSchema = z
  .object({
    reboot_required: z.boolean().optional(),
    system_need_repair: z.boolean().optional(),
  })
  .passthrough();

export const synologyUpgradeStatusDataSchema = z
  .object({
    reboot_required: z.boolean().optional(),
    upgrade_ready: z.boolean().optional(),
  })
  .passthrough();

export const synologyUpgradeCheckDataSchema = z
  .object({
    available: z.boolean().optional(),
    update_count: z.number().optional(),
  })
  .passthrough();

export type SynologyVolumeRecord = {
  name: string;
  displayName?: string;
  usedBytes: number;
  totalBytes: number;
  status: string | undefined;
};

export type SynologyDiskRecord = {
  identifier: string;
  name: string;
  status: string | undefined;
  temperature: number | null;
  volumeName: string | undefined;
};
