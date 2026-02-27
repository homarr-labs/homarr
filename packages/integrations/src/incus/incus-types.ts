import { z } from "zod";

// Base response schema for Incus API
export const incusResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    type: z.enum(["sync", "async", "error"]),
    status: z.string(),
    status_code: z.number(),
    operation: z.string().optional(),
    error_code: z.number().optional(),
    error: z.string().optional(),
    metadata: dataSchema,
  });

// Instance state schema
export const incusInstanceStateSchema = z.object({
  status: z.string(),
  status_code: z.number(),
  pid: z.number(),
  processes: z.number().optional(),
  cpu: z
    .object({
      usage: z.number(), // CPU time in nanoseconds
    })
    .optional(),
  memory: z
    .object({
      usage: z.number(), // Current memory usage in bytes
      usage_peak: z.number(), // Peak memory usage in bytes
      total: z.number().optional(), // Total available memory (for VMs)
    })
    .optional(),
  disk: z
    .record(
      z.string(),
      z.object({
        usage: z.number().optional(), // Disk usage in bytes
        total: z.number().optional(), // Total disk space in bytes
      }),
    )
    .optional(),
  network: z
    .record(
      z.string(),
      z.object({
        addresses: z
          .array(
            z.object({
              family: z.string(),
              address: z.string(),
              netmask: z.string(),
              scope: z.string(),
            }),
          )
          .optional(),
        counters: z.object({
          bytes_received: z.number(),
          bytes_sent: z.number(),
          packets_received: z.number(),
          packets_sent: z.number(),
          errors_received: z.number().optional(),
          errors_sent: z.number().optional(),
        }),
        hwaddr: z.string().optional(),
        host_name: z.string().optional(),
        mtu: z.number().optional(),
        state: z.string().optional(),
        type: z.string().optional(),
      }),
    )
    .optional(),
});

// Instance schema
export const incusInstanceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  status: z.string(),
  status_code: z.number(),
  created_at: z.string(),
  last_used_at: z.string().optional(),
  started_at: z.string().optional(), // When the instance was started (for uptime calculation)
  location: z.string().optional(), // Node name in a cluster
  type: z.enum(["container", "virtual-machine"]),
  architecture: z.string().optional(),
  ephemeral: z.boolean().optional(),
  stateful: z.boolean().optional(),
  profiles: z.array(z.string()).optional(),
  config: z.record(z.string(), z.string()).optional(),
  devices: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  expanded_config: z.record(z.string(), z.string()).optional(),
  expanded_devices: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  project: z.string().optional(),
});

// Cluster member schema
export const incusClusterMemberSchema = z.object({
  server_name: z.string(),
  url: z.string(),
  database: z.boolean(),
  status: z.string(),
  message: z.string().optional(),
  architecture: z.string().optional(),
  failure_domain: z.string().optional(),
  description: z.string().optional(),
  config: z.record(z.string(), z.string()).optional(),
  groups: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
});

// Server resources schema
export const incusServerResourcesSchema = z.object({
  cpu: z.object({
    architecture: z.string().optional(),
    sockets: z
      .array(
        z.object({
          name: z.string().optional(),
          vendor: z.string().optional(),
          socket: z.number(),
          cores: z
            .array(
              z.object({
                core: z.number(),
                threads: z.array(
                  z.object({
                    id: z.number(),
                    thread: z.number(),
                    online: z.boolean(),
                  }),
                ),
              }),
            )
            .optional(),
          cache: z
            .array(
              z.object({
                level: z.number(),
                type: z.string(),
                size: z.number(),
              }),
            )
            .optional(),
          frequency: z.number().optional(),
          frequency_minimum: z.number().optional(),
          frequency_turbo: z.number().optional(),
        }),
      )
      .optional(),
    total: z.number(),
  }),
  memory: z.object({
    used: z.number(),
    total: z.number(),
    hugepages_used: z.number().optional(),
    hugepages_total: z.number().optional(),
  }),
  gpu: z
    .object({
      cards: z
        .array(
          z.object({
            driver: z.string().optional(),
            driver_version: z.string().optional(),
            pci_address: z.string().optional(),
            vendor: z.string().optional(),
            vendor_id: z.string().optional(),
            product: z.string().optional(),
            product_id: z.string().optional(),
          }),
        )
        .optional(),
      total: z.number(),
    })
    .optional(),
  network: z
    .object({
      cards: z
        .array(
          z.object({
            driver: z.string().optional(),
            driver_version: z.string().optional(),
            ports: z
              .array(
                z.object({
                  id: z.string(),
                  address: z.string().optional(),
                  port: z.number().optional(),
                  protocol: z.string().optional(),
                  auto_negotiation: z.boolean().optional(),
                  link_detected: z.boolean().optional(),
                  link_speed: z.number().optional(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
      total: z.number(),
    })
    .optional(),
  storage: z
    .object({
      disks: z
        .array(
          z.object({
            id: z.string(),
            device: z.string(),
            model: z.string().optional(),
            type: z.string().optional(),
            read_only: z.boolean().optional(),
            size: z.number(),
            removable: z.boolean().optional(),
            rpm: z.number().optional(),
            block_size: z.number().optional(),
            partitions: z
              .array(
                z.object({
                  id: z.string(),
                  device: z.string(),
                  read_only: z.boolean().optional(),
                  size: z.number(),
                  partition: z.number(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
      total: z.number(),
    })
    .optional(),
  system: z
    .object({
      uuid: z.string().optional(),
      vendor: z.string().optional(),
      product: z.string().optional(),
      family: z.string().optional(),
      version: z.string().optional(),
      sku: z.string().optional(),
      serial: z.string().optional(),
      type: z.string().optional(),
      firmware: z
        .object({
          date: z.string().optional(),
          vendor: z.string().optional(),
          version: z.string().optional(),
        })
        .optional(),
      chassis: z
        .object({
          serial: z.string().optional(),
          type: z.string().optional(),
          vendor: z.string().optional(),
          version: z.string().optional(),
        })
        .optional(),
      motherboard: z
        .object({
          product: z.string().optional(),
          serial: z.string().optional(),
          vendor: z.string().optional(),
          version: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

// Server state schema
export const incusServerStateSchema = z.object({
  cpu: z.object({
    // CPU usage as a fraction (0.0 - 1.0)
    usage: z.number().optional(),
  }),
  memory: z.object({
    used: z.number(),
    total: z.number(),
  }),
});

// Server info schema
export const incusServerInfoSchema = z.object({
  api_extensions: z.array(z.string()).optional(),
  api_status: z.string().optional(),
  api_version: z.string().optional(),
  auth: z.string().optional(),
  auth_methods: z.array(z.string()).optional(),
  auth_user_name: z.string().optional(),
  auth_user_method: z.string().optional(),
  environment: z
    .object({
      addresses: z.array(z.string()).optional(),
      architectures: z.array(z.string()).optional(),
      certificate: z.string().optional(),
      certificate_fingerprint: z.string().optional(),
      driver: z.string().optional(),
      driver_version: z.string().optional(),
      firewall: z.string().optional(),
      kernel: z.string().optional(),
      kernel_architecture: z.string().optional(),
      kernel_features: z.record(z.string(), z.string()).optional(),
      kernel_version: z.string().optional(),
      os_name: z.string().optional(),
      os_version: z.string().optional(),
      project: z.string().optional(),
      server: z.string().optional(),
      server_clustered: z.boolean().optional(),
      server_event_mode: z.string().optional(),
      server_name: z.string().optional(),
      server_pid: z.number().optional(),
      server_version: z.string().optional(),
      storage: z.string().optional(),
      storage_version: z.string().optional(),
      // Storage drivers - accept any format as different Incus versions return different structures
      storage_supported_drivers: z.array(z.unknown()).optional(),
    })
    .optional(),
  public: z.boolean().optional(),
});

// Storage pool schema
export const incusStoragePoolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  driver: z.string(),
  status: z.string().optional(),
  locations: z.array(z.string()).optional(),
  config: z.record(z.string(), z.string()).optional(),
  used_by: z.array(z.string()).optional(),
});

// Storage pool resources schema
export const incusStoragePoolResourcesSchema = z.object({
  inodes: z
    .object({
      used: z.number(),
      total: z.number(),
    })
    .optional(),
  space: z.object({
    used: z.number(),
    total: z.number(),
  }),
});

// Type exports
export type IncusInstance = z.infer<typeof incusInstanceSchema>;
export type IncusInstanceState = z.infer<typeof incusInstanceStateSchema>;
export type IncusClusterMember = z.infer<typeof incusClusterMemberSchema>;
export type IncusServerResources = z.infer<typeof incusServerResourcesSchema>;
export type IncusServerState = z.infer<typeof incusServerStateSchema>;
export type IncusServerInfo = z.infer<typeof incusServerInfoSchema>;
export type IncusStoragePool = z.infer<typeof incusStoragePoolSchema>;
export type IncusStoragePoolResources = z.infer<typeof incusStoragePoolResourcesSchema>;

// Mapped types for the integration
interface ResourceBase<TType extends string> {
  type: TType;
  name: string;
  node: string;
  isRunning: boolean;
  status: string;
}

export interface IncusComputeResourceBase<TType extends string> extends ResourceBase<TType> {
  id: string;
  cpu: {
    utilization: number; // CPU usage (0-1)
    cores: number;
  };
  memory: {
    used: number; // in bytes
    total: number; // in bytes
  };
  storage: {
    used: number; // in bytes
    total: number; // in bytes
    read: number | null;
    write: number | null;
  };
  network: {
    in: number | null; // bytes received
    out: number | null; // bytes sent
  };
  uptime: number; // in seconds
  haState: string | null;
}

export type IncusNodeResource = IncusComputeResourceBase<"node">;

export interface IncusContainerResource extends IncusComputeResourceBase<"container"> {
  instanceType: "container";
}

export interface IncusVmResource extends IncusComputeResourceBase<"virtual-machine"> {
  instanceType: "virtual-machine";
}

export interface IncusStorageResource extends ResourceBase<"storage"> {
  id: string;
  driver: string;
  used: number; // in bytes
  total: number; // in bytes
  isShared: boolean;
}

export type IncusComputeResource = IncusNodeResource | IncusContainerResource | IncusVmResource;
export type IncusResource = IncusComputeResource | IncusStorageResource;

export interface IncusClusterInfo {
  nodes: IncusNodeResource[];
  containers: IncusContainerResource[];
  vms: IncusVmResource[];
  storages: IncusStorageResource[];
}
