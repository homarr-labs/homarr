import { z } from "zod";

import type {
  ProxmoxClusterInfo,
  ComputeResourceBase,
  Resource,
  NodeResource,
  LxcResource,
  QemuResource,
  StorageResource,
} from "../../proxmox/proxmox-types";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { SystemsHttpOperation } from "./http";
import { SystemsHttpClient, SystemsResourceHold } from "./http";
import { pickProxmoxStats } from "./stats";

const resourceSchema = z.object({
  id: z.string(),
  type: z.string(),
  cpu: z.number().nullish(),
  maxcpu: z.number().nullish(),
  mem: z.number().nullish(),
  maxmem: z.number().nullish(),
  disk: z.number().nullish(),
  maxdisk: z.number().nullish(),
  diskread: z.number().nullish(),
  diskwrite: z.number().nullish(),
  netin: z.number().nullish(),
  netout: z.number().nullish(),
  hastate: z.string().nullish(),
  status: z.string().nullish(),
  name: z.string().nullish(),
  node: z.string().nullish(),
  uptime: z.number().nullish(),
  vmid: z.number().nullish(),
  storage: z.string().nullish(),
  shared: z.number().nullish(),
});
type ProxmoxWireResource = z.infer<typeof resourceSchema>;

export class ProxmoxHeldClient extends SystemsHttpClient {
  async getStatsAsync() {
    return pickProxmoxStats(await this.getClusterInfoAsync());
  }

  override async testConnectionAsync(): Promise<never> {
    throw new SystemsResourceHold("proxmox-sdk-fetch");
  }

  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    const tokenId = `${this.secret("username")}@${this.secret("realm")}!${this.secret("tokenId")}`;
    return { headers: { Authorization: `PVEAPIToken=${tokenId}=${this.secret("apiKey")}` } };
  }

  async getClusterInfoAsync(): Promise<ProxmoxClusterInfo> {
    throw new SystemsResourceHold("proxmox-sdk-fetch");
  }

  protected async testingAsync(_http: SystemsHttpOperation): Promise<never> {
    throw new SystemsResourceHold("proxmox-sdk-fetch");
  }
}

function mapCompute(resource: ProxmoxWireResource): Omit<ComputeResourceBase<string>, "type"> {
  return {
    id: resource.id,
    cpu: { utilization: resource.cpu ?? 0, cores: resource.maxcpu ?? 0 },
    memory: { used: resource.mem ?? 0, total: resource.maxmem ?? 0 },
    storage: {
      used: resource.disk ?? 0,
      total: resource.maxdisk ?? 0,
      read: resource.diskread ?? null,
      write: resource.diskwrite ?? null,
    },
    network: { in: resource.netin ?? null, out: resource.netout ?? null },
    haState: resource.hastate ?? null,
    isRunning: resource.status === "running" || resource.status === "online",
    name: resource.name ?? "",
    node: resource.node ?? "",
    status: resource.status ?? (resource.type === "node" ? "offline" : "stopped"),
    uptime: resource.uptime ?? 0,
  };
}

function mapResource(resource: ProxmoxWireResource): Resource | null {
  switch (resource.type) {
    case "node":
      return { type: "node", ...mapCompute(resource), name: resource.node ?? "" };
    case "lxc":
      return { type: "lxc", vmId: resource.vmid ?? 0, ...mapCompute(resource) };
    case "qemu":
      return { type: "qemu", vmId: resource.vmid ?? 0, ...mapCompute(resource) };
    case "storage":
      return {
        id: resource.id,
        type: "storage",
        name: resource.storage ?? "",
        node: resource.node ?? "",
        isRunning: resource.status === "available",
        status: resource.status ?? "offline",
        storagePlugin: resource.storage ?? "",
        total: resource.maxdisk ?? 0,
        used: resource.disk ?? 0,
        isShared: resource.shared === 1,
      };
    default:
      return null;
  }
}

export function mapProxmoxClusterInfo(payload: unknown): ProxmoxClusterInfo {
  const resources = z
    .array(resourceSchema)
    .parse(payload)
    .map(mapResource)
    .filter((resource): resource is Resource => resource !== null);
  return {
    nodes: resources.filter((resource): resource is NodeResource => resource.type === "node"),
    lxcs: resources.filter((resource): resource is LxcResource => resource.type === "lxc"),
    vms: resources.filter((resource): resource is QemuResource => resource.type === "qemu"),
    storages: resources.filter((resource): resource is StorageResource => resource.type === "storage"),
  };
}
