import dayjs from "dayjs";
import type { fetch as undiciFetch } from "undici/types/fetch";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { humanFileSize } from "@homarr/common";
import { logger } from "@homarr/log";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";
import type { UnraidSystemInfo } from "./unraid-types";
import { unraidSystemInfoSchema } from "./unraid-types";

const localLogger = logger.child({ module: "UnraidIntegration" });

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
    const cpuCount = systemInfo.info.cpu.cores;

    const totalMemory = systemInfo.metrics.memory.total;
    const uptime = dayjs(systemInfo.info.os.uptime);

    return {
      version: systemInfo.info.os.release,
      cpuModelName: systemInfo.info.cpu.brand,
      cpuUtilization: cpuUtilization / cpuCount,
      memUsedInBytes: totalMemory * (systemInfo.metrics.memory.percentTotal / 100),
      memAvailableInBytes: totalMemory,
      uptime: dayjs().diff(uptime, "seconds"),
      network: null, // Not implemented, see https://github.com/unraid/api/issues/1602
      loadAverage: null,
      rebootRequired: false,
      availablePkgUpdates: 0,
      cpuTemp: undefined, // Not implemented, see https://github.com/unraid/api/issues/1597
      fileSystem: systemInfo.array.disks.map((disk) => ({
        deviceName: disk.name,
        used: humanFileSize(disk.fsUsed),
        available: `${disk.fsFree}`,
        percentage: disk.size > 0 ? ((disk.size - disk.fsFree) / disk.size) * 100 : 0,
      })),
      smart: systemInfo.array.disks.map((disk) => ({
        deviceName: disk.name,
        temperature: disk.temp,
        overallStatus: disk.status,
      })),
    };
  }

  private async getSystemInformationAsync(): Promise<UnraidSystemInfo> {
    localLogger.debug("Retrieving system information", {
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
            name
            size
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
          },
          memory {
            layout {
              size     
            }
          }
        }
      }
    `;

    const response = await this.queryGraphQLAsync<UnraidSystemInfo>(query);
    console.log("response from Unraid:", JSON.stringify(response));
    const result = await unraidSystemInfoSchema.parseAsync(response);

    localLogger.debug("Retrieved system information", {
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

    localLogger.debug("Sending GraphQL query", {
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
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as { data: T; errors?: { message: string }[] };

    if (json.errors) {
      throw new Error(`GraphQL errors: ${json.errors.map((error) => error.message).join(", ")}`);
    }

    return json.data;
  }
}
