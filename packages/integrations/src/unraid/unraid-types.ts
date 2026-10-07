import z from "zod";

const filesystemSizeSchema = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER))
  .nullable();

const unraidDiskSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  device: z.string().nullable(),
  fsSize: filesystemSizeSchema,
  fsFree: filesystemSizeSchema,
  fsUsed: filesystemSizeSchema,
  status: z.string().nullable(),
  temp: z.number().nullish(),
});

export const unraidSystemInfoSchema = z.object({
  metrics: z.object({
    cpu: z.object({
      percentTotal: z.number(),
      cpus: z.array(
        z.object({
          percentTotal: z.number(),
        }),
      ),
    }),
    memory: z.object({
      available: z.number(),
      used: z.number(),
      free: z.number(),
      total: z.number().min(0),
      percentTotal: z.number().min(0).max(100),
    }),
  }),
  array: z.object({
    state: z.string(),
    capacity: z.object({
      disks: z.object({
        free: z.coerce.number(),
        total: z.coerce.number(),
        used: z.coerce.number(),
      }),
    }),
    disks: z.array(unraidDiskSchema),
    caches: z.array(unraidDiskSchema),
  }),
  info: z.object({
    devices: z.object({
      network: z.array(
        z.object({
          speed: z.number(),
          dhcp: z.boolean(),
          model: z.string(),
        }),
      ),
    }),
    os: z.object({
      platform: z.string(),
      distro: z.string(),
      release: z.string(),
      uptime: z.coerce.date(),
    }),
    cpu: z.object({
      manufacturer: z.string(),
      brand: z.string(),
      cores: z.number(),
      threads: z.number(),
    }),
  }),
});

export type UnraidSystemInfo = z.infer<typeof unraidSystemInfoSchema>;
