import type { Proxmox } from "proxmox-api";
import proxmoxApi from "proxmox-api";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { extractErrorMessage } from "@homarr/common";
import { logger } from "@homarr/log";

import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type {
  ComputeResourceBase,
  LxcResource,
  NodeResource,
  QemuResource,
  Resource,
  StorageResource,
} from "./proxmox-types";

export class ProxmoxIntegration extends Integration {
  public async testingAsync(): Promise<void> {
    const proxmox = this.getPromoxApi();
    await proxmox.nodes.$get().catch((error) => {
      throw new IntegrationTestConnectionError("internalServerError", extractErrorMessage(error));
    });
  }

  public async getClusterInfoAsync() {
    const proxmox = this.getPromoxApi();
    const resources = await proxmox.cluster.resources.$get();

    logger.info(
      `Found ${resources.length} resources in Proxmox cluster node=${resources.filter((resource) => resource.type === "node").length} lxc=${resources.filter((resource) => resource.type === "lxc").length} qemu=${resources.filter((resource) => resource.type === "qemu").length} storage=${resources.filter((resource) => resource.type === "storage").length}`,
    );

    const mappedResources = resources.map(mapResource).filter((resource) => resource !== null);
    return {
      nodes: mappedResources.filter((resource): resource is NodeResource => resource.type === "node"),
      lxcs: mappedResources.filter((resource): resource is LxcResource => resource.type === "lxc"),
      vms: mappedResources.filter((resource): resource is QemuResource => resource.type === "qemu"),
      storages: mappedResources.filter((resource): resource is StorageResource => resource.type === "storage"),
    };
  }

  private getPromoxApi() {
    return proxmoxApi({
      host: this.url("/").host,
      tokenID: `${this.getSecretValue("username")}@${this.getSecretValue("realm")}!${this.getSecretValue("tokenId")}`,
      tokenSecret: this.getSecretValue("apiKey"),
      fetch: fetchWithTrustedCertificatesAsync,
    });
  }
}

const mapResource = (resource: Proxmox.clusterResourcesResources): Resource | null => {
  switch (resource.type) {
    case "node":
      return mapNodeResource(resource);
    case "lxc":
    case "qemu":
      return mapVmResource(resource);
    case "storage":
      return mapStorageResource(resource);
  }

  return null;
};

const mapComputeResource = (resource: Proxmox.clusterResourcesResources): Omit<ComputeResourceBase<string>, "type"> => {
  return {
    cpu: {
      utilization: resource.cpu ?? 0,
      cores: resource.maxcpu ?? 0,
    },
    memory: {
      used: resource.mem ?? 0,
      total: resource.maxmem ?? 0,
    },
    storage: {
      used: resource.disk ?? 0,
      total: resource.maxdisk ?? 0,
      read: (resource.diskread as number | null) ?? null,
      write: (resource.diskwrite as number | null) ?? null,
    },
    network: {
      in: (resource.netin as number | null) ?? null,
      out: (resource.netout as number | null) ?? null,
    },
    haState: resource.hastate ?? null,
    isRunning: resource.status === "running" || resource.status === "online",
    name: resource.name ?? "",
    node: resource.node ?? "",
    status: resource.status ?? (resource.type === "node" ? "offline" : "stopped"),
    uptime: resource.uptime ?? 0,
  };
};

const mapNodeResource = (resource: Proxmox.clusterResourcesResources): NodeResource => {
  return {
    type: "node",
    ...mapComputeResource(resource),
    name: resource.node ?? "",
  };
};

const mapVmResource = (resource: Proxmox.clusterResourcesResources): LxcResource | QemuResource => {
  return {
    type: resource.type as "lxc" | "qemu",
    vmId: resource.vmid ?? 0,
    ...mapComputeResource(resource),
  };
};

const mapStorageResource = (resource: Proxmox.clusterResourcesResources): StorageResource => {
  return {
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
};
