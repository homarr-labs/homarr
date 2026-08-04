import z from "zod";

/**
 * Wrapper di risposta comune a tutte le chiamate UGOS API (/ugreen/v1/*)
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
 * Metriche realtime: CPU, memoria, rete, I/O
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
 * Elenco dischi fisici con dati SMART. Nota: a differenza degli altri
 * endpoint (v1), questo è sotto /v2/ - incoerenza osservata nell'API UGOS
 * stessa, non un errore di battitura.
 */
export const ugosDiskSchema = z.object({
  name: z.string(), // es. "sda"
  model: z.string(),
  serial: z.string(),
  size: z.number(), // byte
  temperature: z.number(),
  power_on_hours: z.number(),
  status: z.number(), // 0/1 - significato non documentato ufficialmente, 1 osservato = OK su hardware testato
  is_support_smart: z.boolean(),
  used_for: z.string(), // nome del pool a cui appartiene, es. "Storage Pool 1" - assente per dischi non ancora assegnati a un pool
});
export const ugosDiskListDataSchema = z.object({
  result: z.array(ugosDiskSchema),
});
export const ugosDiskListResponseSchema = ugosResponseSchema(ugosDiskListDataSchema);
export type UgosDisk = z.infer<typeof ugosDiskSchema>;

/**
 * GET /ugreen/v1/sysinfo/storage/info
 * Volumi con spazio in byte assoluti. Struttura "piatta": volumes, pools e
 * disks sono array separati allo stesso livello (non annidati), collegati
 * tramite le stringhe label/for_pool. Non c'è un campo "available" esplicito
 * (va calcolato come total - used) né un campo "health" per volume - solo
 * total/used sono garantiti dallo schema, il resto (pools, disks) viene
 * ignorato perché non ci serve (i dati disco arrivano già da /v2/storage/disk/list
 * con più dettaglio, incluso serial e power_on_hours).
 */
export const ugosVolumeSchema = z.object({
  label: z.string(), // es. "Volume 1"
  total: z.number(),
  used: z.number(),
  for_pool: z.string(), // nome del pool a cui appartiene, es. "Storage Pool 1"
});
export const ugosStorageInfoDataSchema = z.object({
  volumes: z.array(ugosVolumeSchema),
});
export const ugosStorageInfoResponseSchema = ugosResponseSchema(ugosStorageInfoDataSchema);
export type UgosVolume = z.infer<typeof ugosVolumeSchema>;

/**
 * GET /ugreen/v1/sysinfo/machine/common
 * Info hardware + uptime
 */
export const ugosCommonInfoDataSchema = z.object({
  common: z.object({
    run_time: z.number(), // secondi
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
