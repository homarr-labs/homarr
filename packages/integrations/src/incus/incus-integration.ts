import { z } from "zod";

import { ResponseError } from "@homarr/common/server";
import { fetchWithMtlsAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IClusterHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { ClusterHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";
import type { LxcResource, NodeResource, QemuResource, StorageResource } from "../proxmox/proxmox-types";
import { IncusApiErrorHandler } from "./incus-error-handler";
import type {
  IncusClusterMember,
  IncusInstance,
  IncusInstanceState,
  IncusServerInfo,
  IncusServerResources,
  IncusStoragePool,
  IncusStoragePoolResources,
} from "./incus-types";
import {
  incusClusterMemberSchema,
  incusInstanceSchema,
  incusInstanceStateSchema,
  incusResponseSchema,
  incusServerInfoSchema,
  incusServerResourcesSchema,
  incusStoragePoolResourcesSchema,
  incusStoragePoolSchema,
} from "./incus-types";

const logger = createLogger({ module: "incusIntegration" });

@HandleIntegrationErrors([new IncusApiErrorHandler()])
export class IncusIntegration extends Integration implements IClusterHealthMonitoringIntegration {
  /**
   * Test the connection to the Incus server
   * Uses mTLS (mutual TLS) with client certificate authentication
   */
  protected async testingAsync(_input: IntegrationTestingInput): Promise<TestingResult> {
    // Use the regular fetchApiAsync to test connection with mTLS
    await this.getServerInfoAsync();
    return { success: true };
  }

  /**
   * Get the mTLS options for client certificate authentication
   * Incus uses TLS client certificates for authentication
   */
  private getMtlsOptions() {
    return {
      mtls: {
        cert: this.getSecretValue("clientCertificate"),
        key: this.getSecretValue("privateKey"),
      },
    };
  }

  /**
   * Make an authenticated API request to the Incus server
   */
  private async fetchApiAsync<T>(
    path: `/${string}`,
    schema: ReturnType<typeof incusResponseSchema<z.ZodTypeAny>>,
  ): Promise<T> {
    const url = this.url(path);
    const response = await fetchWithMtlsAsync(url, {
      headers: {
        "Content-Type": "application/json",
      },
      ...this.getMtlsOptions(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = await response.json();
    const parsed = schema.parse(data);

    if (parsed.type === "error") {
      throw new Error(parsed.error ?? `API error: ${parsed.status_code}`);
    }

    return parsed.metadata as T;
  }

  /**
   * Fetch raw text from an API endpoint (for metrics)
   */
  private async fetchRawAsync(path: `/${string}`): Promise<string> {
    const url = this.url(path);
    const response = await fetchWithMtlsAsync(url, {
      headers: {
        Accept: "text/plain",
      },
      ...this.getMtlsOptions(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return await response.text();
  }

  /**
   * Parse Prometheus metrics format to extract specific metric values
   */
  private parsePrometheusMetric(metricsText: string, metricName: string): number | null {
    const lines = metricsText.split("\n");
    for (const line of lines) {
      if (line.startsWith(metricName) && !line.startsWith("#")) {
        const match = line.match(/\s+(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*$/);
        if (match?.[1]) {
          return parseFloat(match[1]);
        }
        // Try simpler format: metric_name value
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            const value = parseFloat(lastPart);
            if (!isNaN(value)) {
              return value;
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Get server metrics (uptime, etc.) from the Prometheus metrics endpoint
   */
  public async getServerMetricsAsync(): Promise<{ uptime: number }> {
    try {
      const metricsText = await this.fetchRawAsync("/1.0/metrics");
      const uptime = this.parsePrometheusMetric(metricsText, "incus_uptime_seconds");
      return {
        uptime: uptime ?? 0,
      };
    } catch (error) {
      logger.debug("Could not fetch server metrics", { error });
      return { uptime: 0 };
    }
  }

  /**
   * Get server information
   */
  public async getServerInfoAsync(): Promise<IncusServerInfo> {
    return this.fetchApiAsync("/1.0", incusResponseSchema(incusServerInfoSchema));
  }

  /**
   * Get server resources (CPU, memory, storage, etc.)
   */
  public async getServerResourcesAsync(): Promise<IncusServerResources> {
    return this.fetchApiAsync("/1.0/resources", incusResponseSchema(incusServerResourcesSchema));
  }

  /**
   * Check if the server is part of a cluster
   */
  public async isClusteredAsync(): Promise<boolean> {
    const serverInfo = await this.getServerInfoAsync();
    return serverInfo.environment?.server_clustered ?? false;
  }

  /**
   * Get cluster members (only available in cluster mode)
   */
  public async getClusterMembersAsync(): Promise<IncusClusterMember[]> {
    const memberUrls = await this.fetchApiAsync<string[]>(
      "/1.0/cluster/members",
      incusResponseSchema(z.array(z.string())),
    );

    // If we get URLs, we need to fetch each member's details
    if (memberUrls.length > 0 && typeof memberUrls[0] === "string" && memberUrls[0].startsWith("/")) {
      const members: IncusClusterMember[] = [];
      for (const memberUrl of memberUrls) {
        const member = await this.fetchApiAsync<IncusClusterMember>(
          memberUrl as `/${string}`,
          incusResponseSchema(incusClusterMemberSchema),
        );
        members.push(member);
      }
      return members;
    }

    return memberUrls as unknown as IncusClusterMember[];
  }

  /**
   * Get all instances (containers and virtual machines)
   */
  public async getInstancesAsync(): Promise<IncusInstance[]> {
    // Get instance URLs first
    const instanceUrls = await this.fetchApiAsync<string[]>(
      "/1.0/instances",
      incusResponseSchema(z.array(z.string())),
    );

    const instances: IncusInstance[] = [];
    for (const instanceUrl of instanceUrls) {
      try {
        const instance = await this.fetchApiAsync<IncusInstance>(
          instanceUrl as `/${string}`,
          incusResponseSchema(incusInstanceSchema),
        );
        instances.push(instance);
      } catch (error) {
        logger.warn("Failed to fetch instance", { instanceUrl, error });
      }
    }

    return instances;
  }

  /**
   * Get the state of a specific instance
   */
  public async getInstanceStateAsync(instanceName: string): Promise<IncusInstanceState> {
    return this.fetchApiAsync(
      `/1.0/instances/${instanceName}/state`,
      incusResponseSchema(incusInstanceStateSchema),
    );
  }

  /**
   * Change the state of an instance (start, stop, restart, freeze, unfreeze)
   */
  private async changeInstanceStateAsync(
    instanceName: string,
    action: "start" | "stop" | "restart" | "freeze" | "unfreeze",
    force = false,
    timeout = 30,
  ): Promise<void> {
    const url = this.url(`/1.0/instances/${instanceName}/state`);
    const response = await fetchWithMtlsAsync(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        timeout,
        force,
        stateful: false,
      }),
      ...this.getMtlsOptions(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = await response.json();
    const parsed = incusResponseSchema(z.unknown()).parse(data);

    // For async operations, we might get an operation URL
    if (parsed.type === "async" && parsed.operation) {
      // Wait for the operation to complete (with timeout)
      await this.waitForOperationAsync(parsed.operation, timeout * 1000);
    } else if (parsed.type === "error") {
      throw new Error(parsed.error ?? `Failed to ${action} instance`);
    }
  }

  /**
   * Wait for an async operation to complete
   */
  private async waitForOperationAsync(operationUrl: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.fetchApiAsync<{ status: string; status_code: number }>(
          `${operationUrl}/wait?timeout=5` as `/${string}`,
          incusResponseSchema(z.object({ status: z.string(), status_code: z.number() }).passthrough()),
        );

        // Status codes: 200 = Success, 400+ = Failure
        if (status.status_code === 200) {
          return;
        }
        if (status.status_code >= 400) {
          throw new Error(`Operation failed with status: ${status.status}`);
        }
      } catch (error) {
        // If it's not a timeout error, throw it
        if (error instanceof Error && !error.message.includes("timeout")) {
          throw error;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Operation timed out");
  }

  /**
   * Start an instance
   */
  public async startInstanceAsync(instanceName: string): Promise<void> {
    await this.changeInstanceStateAsync(instanceName, "start");
    logger.info(`Started instance ${instanceName}`);
  }

  /**
   * Stop an instance
   */
  public async stopInstanceAsync(instanceName: string, force = false): Promise<void> {
    await this.changeInstanceStateAsync(instanceName, "stop", force);
    logger.info(`Stopped instance ${instanceName}`);
  }

  /**
   * Restart an instance
   */
  public async restartInstanceAsync(instanceName: string, force = false): Promise<void> {
    await this.changeInstanceStateAsync(instanceName, "restart", force);
    logger.info(`Restarted instance ${instanceName}`);
  }

  /**
   * Freeze an instance (pause)
   */
  public async freezeInstanceAsync(instanceName: string): Promise<void> {
    await this.changeInstanceStateAsync(instanceName, "freeze");
    logger.info(`Frozen instance ${instanceName}`);
  }

  /**
   * Unfreeze an instance (resume)
   */
  public async unfreezeInstanceAsync(instanceName: string): Promise<void> {
    await this.changeInstanceStateAsync(instanceName, "unfreeze");
    logger.info(`Unfrozen instance ${instanceName}`);
  }

  /**
   * Get all storage pools
   */
  public async getStoragePoolsAsync(): Promise<IncusStoragePool[]> {
    const poolUrls = await this.fetchApiAsync<string[]>(
      "/1.0/storage-pools",
      incusResponseSchema(z.array(z.string())),
    );

    const pools: IncusStoragePool[] = [];
    for (const poolUrl of poolUrls) {
      try {
        const pool = await this.fetchApiAsync<IncusStoragePool>(
          poolUrl as `/${string}`,
          incusResponseSchema(incusStoragePoolSchema),
        );
        pools.push(pool);
      } catch (error) {
        logger.warn("Failed to fetch storage pool", { poolUrl, error });
      }
    }

    return pools;
  }

  /**
   * Get storage pool resources
   */
  public async getStoragePoolResourcesAsync(poolName: string): Promise<IncusStoragePoolResources> {
    return this.fetchApiAsync(
      `/1.0/storage-pools/${poolName}/resources`,
      incusResponseSchema(incusStoragePoolResourcesSchema),
    );
  }

  /**
   * Get cluster information including nodes, containers, VMs, and storage
   * Implements the IClusterHealthMonitoringIntegration interface
   * Returns data in ClusterHealthMonitoring format (compatible with Proxmox types)
   */
  public async getClusterInfoAsync(): Promise<ClusterHealthMonitoring> {
    const isClustered = await this.isClusteredAsync();
    const serverInfo = await this.getServerInfoAsync();
    const instances = await this.getInstancesAsync();
    const storagePools = await this.getStoragePoolsAsync();

    logger.info("Found resources in Incus", {
      isClustered,
      instanceCount: instances.length,
      containerCount: instances.filter((i) => i.type === "container").length,
      vmCount: instances.filter((i) => i.type === "virtual-machine").length,
      storagePoolCount: storagePools.length,
    });

    // Build nodes list
    const nodes: NodeResource[] = [];
    if (isClustered) {
      const clusterMembers = await this.getClusterMembersAsync();
      for (const member of clusterMembers) {
        nodes.push(await this.mapClusterMemberToNodeResource(member));
      }
    } else {
      // Single server mode - create a node from server info
      nodes.push(await this.mapServerToNodeResource(serverInfo));
    }

    // Build containers (lxcs) and VMs lists
    const lxcs: LxcResource[] = [];
    const vms: QemuResource[] = [];

    let vmIdCounter = 100; // Start VM IDs at 100 (similar to Proxmox convention)
    for (const instance of instances) {
      try {
        const state = await this.getInstanceStateAsync(instance.name);
        if (instance.type === "container") {
          lxcs.push(this.mapInstanceToLxcResource(instance, state, vmIdCounter++));
        } else {
          vms.push(this.mapInstanceToQemuResource(instance, state, vmIdCounter++));
        }
      } catch (error) {
        logger.warn("Failed to get instance state", { instanceName: instance.name, error });
        // Add instance with default/empty state
        if (instance.type === "container") {
          lxcs.push(this.mapInstanceToLxcResource(instance, null, vmIdCounter++));
        } else {
          vms.push(this.mapInstanceToQemuResource(instance, null, vmIdCounter++));
        }
      }
    }

    // Build storage list
    const storages: StorageResource[] = [];
    for (const pool of storagePools) {
      try {
        const resources = await this.getStoragePoolResourcesAsync(pool.name);
        storages.push(this.mapStoragePoolToResource(pool, resources, nodes));
      } catch (error) {
        logger.warn("Failed to get storage pool resources", { poolName: pool.name, error });
        storages.push(this.mapStoragePoolToResource(pool, null, nodes));
      }
    }

    return {
      nodes,
      lxcs,
      vms,
      storages,
    };
  }

  /**
   * Map a cluster member to a node resource
   */
  private async mapClusterMemberToNodeResource(member: IncusClusterMember): Promise<NodeResource> {
    let resources: IncusServerResources | null = null;
    let metrics: { uptime: number } = { uptime: 0 };
    
    try {
      // In cluster mode, we can't easily get per-node resources
      // For now, we'll use the server resources if available
      resources = await this.getServerResourcesAsync();
    } catch {
      logger.debug("Could not fetch server resources for cluster member", { memberName: member.server_name });
    }

    try {
      metrics = await this.getServerMetricsAsync();
    } catch {
      logger.debug("Could not fetch server metrics for cluster member", { memberName: member.server_name });
    }

    return {
      type: "node",
      id: `node/${member.server_name}`,
      name: member.server_name,
      node: member.server_name,
      isRunning: member.status === "Online",
      status: member.status.toLowerCase(),
      cpu: {
        utilization: 0, // Not directly available from cluster member info
        cores: resources?.cpu.total ?? 0,
      },
      memory: {
        used: resources?.memory.used ?? 0,
        total: resources?.memory.total ?? 0,
      },
      storage: {
        used: 0,
        total: 0,
        read: null,
        write: null,
      },
      network: {
        in: null,
        out: null,
      },
      uptime: metrics.uptime,
      haState: null,
    };
  }

  /**
   * Map server info to a node resource (for single server mode)
   */
  private async mapServerToNodeResource(serverInfo: IncusServerInfo): Promise<NodeResource> {
    const serverName = serverInfo.environment?.server_name ?? "incus";
    let resources: IncusServerResources | null = null;
    let metrics: { uptime: number } = { uptime: 0 };

    try {
      resources = await this.getServerResourcesAsync();
    } catch {
      logger.debug("Could not fetch server resources");
    }

    try {
      metrics = await this.getServerMetricsAsync();
    } catch {
      logger.debug("Could not fetch server metrics");
    }

    return {
      type: "node",
      id: `node/${serverName}`,
      name: serverName,
      node: serverName,
      isRunning: true,
      status: "online",
      cpu: {
        utilization: 0, // Incus doesn't provide real-time CPU utilization %
        cores: resources?.cpu.total ?? 0,
      },
      memory: {
        used: resources?.memory.used ?? 0,
        total: resources?.memory.total ?? 0,
      },
      storage: {
        used: 0,
        total: resources?.storage?.total ?? 0,
        read: null,
        write: null,
      },
      network: {
        in: null,
        out: null,
      },
      uptime: metrics.uptime,
      haState: null,
    };
  }

  /**
   * Map an Incus container instance to an LXC resource (Proxmox-compatible)
   */
  private mapInstanceToLxcResource(
    instance: IncusInstance,
    state: IncusInstanceState | null,
    vmId: number,
  ): LxcResource {
    const networkStats = this.calculateNetworkStats(state);
    const diskStats = this.calculateDiskStats(state);
    const uptime = this.calculateInstanceUptime(instance);
    const cores = this.getInstanceCpuCores(instance);

    return {
      type: "lxc",
      vmId,
      id: `lxc/${vmId}`,
      name: instance.name,
      node: instance.location ?? "local",
      isRunning: instance.status === "Running",
      status: instance.status.toLowerCase(),
      cpu: {
        utilization: 0, // CPU usage would need to be calculated from state.cpu.usage over time
        cores,
      },
      memory: {
        used: state?.memory?.usage ?? 0,
        total: state?.memory?.total ?? state?.memory?.usage_peak ?? 0,
      },
      storage: {
        used: diskStats.used,
        total: diskStats.total,
        read: null,
        write: null,
      },
      network: {
        in: networkStats.bytesReceived,
        out: networkStats.bytesSent,
      },
      uptime,
      haState: null,
    };
  }

  /**
   * Map an Incus virtual-machine instance to a QEMU resource (Proxmox-compatible)
   */
  private mapInstanceToQemuResource(
    instance: IncusInstance,
    state: IncusInstanceState | null,
    vmId: number,
  ): QemuResource {
    const networkStats = this.calculateNetworkStats(state);
    const diskStats = this.calculateDiskStats(state);
    const uptime = this.calculateInstanceUptime(instance);
    const cores = this.getInstanceCpuCores(instance);

    return {
      type: "qemu",
      vmId,
      id: `qemu/${vmId}`,
      name: instance.name,
      node: instance.location ?? "local",
      isRunning: instance.status === "Running",
      status: instance.status.toLowerCase(),
      cpu: {
        utilization: 0,
        cores,
      },
      memory: {
        used: state?.memory?.usage ?? 0,
        total: state?.memory?.total ?? state?.memory?.usage_peak ?? 0,
      },
      storage: {
        used: diskStats.used,
        total: diskStats.total,
        read: null,
        write: null,
      },
      network: {
        in: networkStats.bytesReceived,
        out: networkStats.bytesSent,
      },
      uptime,
      haState: null,
    };
  }

  /**
   * Map a storage pool to a storage resource
   */
  private mapStoragePoolToResource(
    pool: IncusStoragePool,
    resources: IncusStoragePoolResources | null,
    nodes: NodeResource[],
  ): StorageResource {
    const isShared = (pool.locations?.length ?? 0) > 1 || pool.driver === "ceph" || pool.driver === "cephfs";
    const nodeName = pool.locations?.[0] ?? nodes[0]?.name ?? "local";

    return {
      type: "storage",
      id: `storage/${nodeName}/${pool.name}`,
      name: pool.name,
      node: nodeName,
      isRunning: pool.status === "Created",
      status: pool.status?.toLowerCase() ?? "unknown",
      storagePlugin: pool.driver,
      used: resources?.space.used ?? 0,
      total: resources?.space.total ?? 0,
      isShared,
    };
  }

  /**
   * Calculate aggregate network statistics from instance state
   */
  private calculateNetworkStats(state: IncusInstanceState | null): { bytesReceived: number | null; bytesSent: number | null } {
    if (!state?.network) {
      return { bytesReceived: null, bytesSent: null };
    }

    let bytesReceived = 0;
    let bytesSent = 0;

    for (const [name, netInterface] of Object.entries(state.network)) {
      // Skip loopback interface
      if (name === "lo") continue;

      bytesReceived += netInterface.counters.bytes_received;
      bytesSent += netInterface.counters.bytes_sent;
    }

    return { bytesReceived, bytesSent };
  }

  /**
   * Calculate aggregate disk statistics from instance state
   */
  private calculateDiskStats(state: IncusInstanceState | null): { used: number; total: number } {
    if (!state?.disk) {
      return { used: 0, total: 0 };
    }

    let used = 0;
    let total = 0;

    for (const disk of Object.values(state.disk)) {
      used += disk.usage ?? 0;
      total += disk.total ?? 0;
    }

    return { used, total };
  }

  /**
   * Calculate instance uptime in seconds from started_at or last_used_at timestamp
   */
  private calculateInstanceUptime(instance: IncusInstance): number {
    // Use started_at if available, otherwise fall back to last_used_at
    const startTime = instance.started_at ?? instance.last_used_at;
    
    if (!startTime || instance.status !== "Running") {
      return 0;
    }

    try {
      const startDate = new Date(startTime);
      const now = new Date();
      const uptimeMs = now.getTime() - startDate.getTime();
      return Math.max(0, Math.floor(uptimeMs / 1000));
    } catch {
      return 0;
    }
  }

  /**
   * Get CPU cores allocated to an instance from its config
   */
  private getInstanceCpuCores(instance: IncusInstance): number {
    // Check expanded_config first, then config
    const cpuLimit = instance.expanded_config?.["limits.cpu"] ?? instance.config?.["limits.cpu"];
    
    if (cpuLimit) {
      // Can be a number like "2" or a range like "0-3" or a list like "0,1,2"
      const parsed = parseInt(cpuLimit, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
      
      // Handle range format "0-3" -> 4 cores
      const rangeMatch = cpuLimit.match(/^(\d+)-(\d+)$/);
      if (rangeMatch?.[1] && rangeMatch[2]) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        return end - start + 1;
      }
      
      // Handle list format "0,1,2" -> 3 cores
      const listMatch = cpuLimit.match(/^[\d,]+$/);
      if (listMatch) {
        return cpuLimit.split(",").length;
      }
    }
    
    return 0;
  }
}
