import z from "zod";

/**
 * Response wrapper common to all UGOS API calls (/ugreen/v1/*)
 */
const ugosResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: z.number(),
    msg: z.string(),
    data: dataSchema,
    time: z.number(),
  });

/**
 * POST /ugreen/v1/verify/login
 */
export const ugosLoginDataSchema = z.object({
  token: z.string(),
  model: z.string(),
  nas_name: z.string(),
  system_version: z.string(),
});
export const ugosLoginResponseSchema = ugosResponseSchema(ugosLoginDataSchema);
export type UgosLoginResponse = z.infer<typeof ugosLoginResponseSchema>;

/**
 * GET /ugreen/v1/taskmgr/stat/get_all
 * Real-time metrics: CPU, memory, network, I/O
 */
export const ugosStatGetAllDataSchema = z.object({
  cpu: z.object({
    series: z.array(
      z.object({
        used_percent: z.number(),
        temp: z.number(),
      }),
    ),
  }),
  mem: z.object({
    structure: z.object({
      total: z.number(),
      used: z.number(),
      free: z.number(),
      share: z.number(),
      cache: z.number(),
    }),
  }),
});
export const ugosStatGetAllResponseSchema = ugosResponseSchema(ugosStatGetAllDataSchema);
export type UgosStatGetAll = z.infer<typeof ugosStatGetAllDataSchema>;

/**
 * GET /ugreen/v2/storage/disk/list
 * List of physical disks with SMART data. Note: unlike the other
 * endpoints (v1), this one is under /v2/ - an inconsistency observed in
 * the UGOS API itself, not a typo.
 */
export const ugosDiskSchema = z.object({
  name: z.string(), // e.g. "sda"
  model: z.string(),
  serial: z.string(),
  size: z.number(), // bytes
  temperature: z.number(),
  power_on_hours: z.number(),
  status: z.number(), // 0/1 - meaning not officially documented, 1 observed = OK on tested hardware
  is_support_smart: z.boolean(),
  used_for: z.string().default(""), // name of the pool it belongs to, e.g. "Storage Pool 1" - absent for disks not yet assigned to a pool (empty default so it doesn't fail parsing of the whole response)
});
export const ugosDiskListDataSchema = z.object({
  result: z.array(ugosDiskSchema),
});
export const ugosDiskListResponseSchema = ugosResponseSchema(ugosDiskListDataSchema);
export type UgosDisk = z.infer<typeof ugosDiskSchema>;

/**
 * GET /ugreen/v1/sysinfo/storage/info
 * Volumes with absolute byte space. "Flat" structure: volumes, pools and
 * disks are separate arrays at the same level (not nested), linked via
 * the label/for_pool strings. There's no explicit "available" field (it
 * must be computed as total - used) nor a "health" field per volume -
 * only total/used are guaranteed by the schema, the rest (pools, disks)
 * is ignored because we don't need it (disk data already comes from
 * /v2/storage/disk/list with more detail, including serial and
 * power_on_hours).
 */
export const ugosVolumeSchema = z.object({
  label: z.string(), // e.g. "Volume 1"
  total: z.number(),
  used: z.number(),
  for_pool: z.string(), // name of the pool it belongs to, e.g. "Storage Pool 1"
});
export const ugosStorageInfoDataSchema = z.object({
  volumes: z.array(ugosVolumeSchema),
});
export const ugosStorageInfoResponseSchema = ugosResponseSchema(ugosStorageInfoDataSchema);
export type UgosVolume = z.infer<typeof ugosVolumeSchema>;

/**
 * GET /ugreen/v1/sysinfo/machine/common
 * Hardware info + uptime
 */
export const ugosCommonInfoDataSchema = z.object({
  common: z.object({
    run_time: z.number(), // seconds
    system_version: z.string(),
  }),
  hardware: z.object({
    cpu: z.array(
      z.object({
        model: z.string(),
        core: z.number(),
        thread: z.number(),
      }),
    ),
  }),
});
export const ugosCommonInfoResponseSchema = ugosResponseSchema(ugosCommonInfoDataSchema);
export type UgosCommonInfo = z.infer<typeof ugosCommonInfoDataSchema>;
