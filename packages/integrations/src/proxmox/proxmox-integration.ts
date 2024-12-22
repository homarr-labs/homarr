import proxmoxApi from "proxmox-api";

import { Integration } from "../base/integration";
import type { HealthMonitoring } from "../interfaces/health-monitoring/healt-monitoring";

export class ProxmoxIntegration extends Integration {
  public async testConnectionAsync(): Promise<void> {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // TODO: Can we improve this?
    const proxmox = this.getPromoxApi();
    await proxmox.nodes.$get();
  }

  public async getSystemInfoAsync(): Promise<HealthMonitoring> {
    const proxmox = this.getPromoxApi();
    const resources = await proxmox.cluster.resources.$get();

    let resourceSummary: ResourceSummary = { vms: [], lxcs: [], nodes: [], storage: [] };
    resources.forEach((item) => {
      let resource: ResourceData = {
        id: item.id,
        cpu: item.cpu ? item.cpu : 0,
        maxCpu: item.maxcpu ? item.maxcpu : 0,
        maxMem: item.maxmem ? item.maxmem : 0,
        mem: item.mem ? item.mem : 0,
        name: item.name,
        node: item.node,
        status: item.status,
        running: false,
        type: item.type,
        uptime: item.uptime,
        vmId: item.vmid,
        netIn: item.netin,
        netOut: item.netout,
        diskRead: item.diskread,
        diskWrite: item.diskwrite,
        disk: item.disk,
        maxDisk: item.maxdisk,
        haState: item.hastate,
        storagePlugin: item.plugintype,
        storageShared: item.shared == 1,
      };
      if (item.template == 0) {
        if (item.type === "qemu") {
          resource.running = resource.status === "running";
          resourceSummary.vms.push(resource);
        } else if (item.type === "lxc") {
          resource.running = resource.status === "running";
          resourceSummary.lxcs.push(resource);
        }
      } else if (item.type === "node") {
        resource.name = item.node;
        resource.running = resource.status === "online";
        resourceSummary.nodes.push(resource);
      } else if (item.type === "storage") {
        resource.name = item.storage;
        resource.running = resource.status === "available";
        resourceSummary.storage.push(resource);
      }
    });
  }

  private getPromoxApi() {
    return proxmoxApi({
      host: this.url("/").host,
      tokenID: `${this.getSecretValue("username")}@${this.getSecretValue("realm")}!${this.getSecretValue("tokenId")}`,
      tokenSecret: this.getSecretValue("apiKey"),
    });
  }
}
