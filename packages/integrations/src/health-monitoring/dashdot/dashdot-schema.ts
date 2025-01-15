import { z } from "zod";

export const cpuLoadSchema = z.array(
  z.object({
    load: z.number().min(0),
    temp: z.number().min(0).optional(),
    core: z.number(),
  }),
);

export const memoryLoadSchema = z.object({
  load: z.number().min(0),
});

export const storageLoadSchema = z.array(z.number().min(0));

export const networkLoadSchema = z.object({
  up: z.number().min(0),
  down: z.number().min(0),
});

export const serverInfoSchema = z.object({
  os: z.object({
    distro: z.string(),
    kernel: z.string(),
    release: z.string(),
    uptime: z.number().min(0),
  }),
  cpu: z.object({
    brand: z.string(),
    model: z.string(),
  }),
  ram: z.object({
    size: z.number().min(0),
    layout: z.array(z.object({ brand: z.string(), type: z.string() })).nonempty(),
  }),
  storage: z.array(
    z.object({
      size: z.number().min(0),
      disks: z.array(
        z.object({
          device: z.string(),
          brand: z.string(),
          type: z.string(),
        }),
      ),
    }),
  ),
  network: z.object({
    interfaceSpeed: z
      .number()
      .min(0)
      .transform((speed) => speed / 1000),
    type: z.enum(["Wireless", "Bridge", "Bond", "TAP", "Wired"]),
  }),
});

export const configSchema = z.object({
  config: z.object({
    use_network_interface: z.string().default("UNKNOWN"),
    network_speed_as_bytes: z.boolean(),
    fs_virtual_mounts: z.array(z.string()),
    use_imperial: z.boolean(),
    override: z
      .object({
        os: z.string(),
        cpu_brand: z.string(),
        cpu_model: z.string(),
        cpu_frequency: z.number().min(0),
        ram_brand: z.string(),
        ram_size: z.number().min(0),
        ram_type: z.string(),
        ram_frequency: z.number().min(0),
        storage_brands: z.record(z.string(), z.string()),
        storage_sizes: z.record(z.string(), z.number().min(0)),
        storage_types: z.record(z.string(), z.string()),
        network_interface_speed: z
          .number()
          .min(0)
          .transform((speed) => speed / 1000),
      })
      .partial(),
  }),
});
