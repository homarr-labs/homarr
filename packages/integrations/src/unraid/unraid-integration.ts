import dayjs from "dayjs";
import type { fetch as undiciFetch } from "undici/types/fetch";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";
import type { UnraidSystemInfo } from "./unraid-types";
import { unraidSystemInfoSchema } from "./unraid-types";

const logger = createLogger({ module: "UnraidIntegration" });

@HandleIntegrationErrors([])
export class UnraidIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    await this.queryGraphQLAsync<{ info: UnraidSystemInfo }>(
      `
      query {
        info {
          os { platform }
        }
      }
      `,
      input.fetchAsync,
    );

    return { success: true };
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const systemInfo = await this.getSystemInformationAsync();

    const cpuUtilization = systemInfo.metrics.cpu.cpus.reduce((acc, val) => acc + val.percentTotal, 0);
    const cpuCount = systemInfo.metrics.cpu.cpus.length;
    let cpuUtilizationNormalized = 0;
    if (cpuCount > 0) {
      cpuUtilizationNormalized = cpuUtilization / cpuCount;
    }

    const totalMemory = systemInfo.metrics.memory.total;
    const usedMemory = Math.max(totalMemory - systemInfo.metrics.memory.available, 0);
    const uptime = dayjs(systemInfo.info.os.uptime);
    const disks = [...systemInfo.array.disks, ...systemInfo.array.caches];
    const fileSystem = disks.flatMap((disk) => {
      // Only the pool member reporting filesystem statistics represents its capacity.
      if (disk.fsSize === null || disk.fsFree === null || disk.fsUsed === null) return [];
      if (disk.fsSize === 0) return [];

      return [
        {
          deviceName: disk.name ?? disk.device ?? disk.id,
          used: `${disk.fsUsed * 1024}`, // API filesystem sizes are in KiB.
          available: `${disk.fsFree * 1024}`,
          percentage: (disk.fsUsed / disk.fsSize) * 100,
        },
      ];
    });

    return {
      version: systemInfo.info.os.release,
      cpuModelName: systemInfo.info.cpu.brand,
      cpuUtilization: cpuUtilizationNormalized,
      memUsedInBytes: usedMemory,
      memAvailableInBytes: totalMemory - usedMemory,
      uptime: dayjs().diff(uptime, "seconds"),
      network: null, // Not implemented, see https://github.com/unraid/api/issues/1602
      loadAverage: null,
      rebootRequired: false,
      availablePkgUpdates: 0,
      cpuTemp: undefined, // Not implemented, see https://github.com/unraid/api/issues/1597
      fileSystem,
      smart: disks.map((disk) => ({
        deviceName: disk.name ?? disk.device ?? disk.id,
        temperature: disk.temp ?? null,
        overallStatus: disk.status ?? "UNKNOWN",
        // See ArrayDiskStatus from https://studio.apollographql.com/public/Unraid-API/variant/current/explorer
        healthy: disk.status === "DISK_OK",
      })),
      gpu: [],
    };
  }

  private async getSystemInformationAsync(): Promise<UnraidSystemInfo> {
    logger.debug("Retrieving system information", {
      url: this.url("/graphql"),
    });

    const query = `
      query {
        metrics {
          cpu {
            percentTotal
            cpus {
              percentTotal
            }
          },
          memory {
            available
            used
            free
            total
            swapFree
            swapTotal
            swapUsed
            percentTotal
          }
        }
        array {
          state
          capacity {
            disks {
              free
              total
              used
            }
          }
          disks {
            id
            name
            device
            fsSize
            fsFree
            fsUsed
            status
            temp
          }
          caches {
            id
            name
            device
            fsSize
            fsFree
            fsUsed
            status
            temp
          }
        }
        info {
          devices {
            network {
              speed
              dhcp
              model
              model
            }
          }
          os {
            platform,
            distro,
            release,
            uptime
          },
          cpu {
            manufacturer,
            brand,
            cores,
            threads
          }
        }
      }
    `;

    const response = await this.queryGraphQLAsync<UnraidSystemInfo>(query);
    const result = await unraidSystemInfoSchema.parseAsync(response);

    logger.debug("Retrieved system information", {
      url: this.url("/graphql"),
    });

    return result;
  }

  private async queryGraphQLAsync<T>(
    query: string,
    fetchAsync: typeof undiciFetch = fetchWithTrustedCertificatesAsync,
  ): Promise<T> {
    const url = this.url("/graphql");
    const apiKey = this.getSecretValue("apiKey");

    logger.debug("Sending GraphQL query", {
      url: url.toString(),
    });

    const response = await fetchAsync(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const json = (await response.json()) as { data: T; errors?: { message: string }[] };

    if (json.errors) {
      throw new Error(`GraphQL errors: ${json.errors.map((error) => error.message).join(", ")}`);
    }

    return json.data;
  }
}
