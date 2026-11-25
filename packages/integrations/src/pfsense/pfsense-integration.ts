import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createChannelEventHistoryOld } from "@homarr/redis";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  FirewallInterface,
  FirewallInterfacesSummary,
  FirewallVersionSummary,
} from "../interfaces/firewall-summary/firewall-summary-types";
import { pfsenseInterfacesSchema, pfsenseSystemStatusSchema, pfsenseVersionSchema } from "./pfsense-types";

const versionPath = "/api/v2/system/version";
const systemStatusPath = "/api/v2/status/system";
const interfacesPath = "/api/v2/status/interfaces";

export class PfSenseIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const signal = AbortSignal.timeout(10_000);
    const request = (path: `/${string}`) => this.getJsonAsync(path, input.fetchAsync, signal);
    await Promise.all([
      request(versionPath).then((json) => pfsenseVersionSchema.parse(json)),
      request(systemStatusPath).then((json) => pfsenseSystemStatusSchema.parse(json)),
      request(interfacesPath).then((json) => pfsenseInterfacesSchema.parse(json)),
    ]);
    return { success: true };
  }

  private async getJsonAsync(
    path: `/${string}`,
    fetchAsync: IntegrationTestingInput["fetchAsync"] = fetchWithTrustedCertificatesAsync,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const response = await fetchAsync(this.url(path), {
      headers: { "x-api-key": this.getSecretValue("apiKey") },
      redirect: "error",
      signal,
    });
    if (!response.ok) {
      throw new ResponseError(response);
    }
    return await response.json();
  }

  public async getFirewallVersionAsync(): Promise<FirewallVersionSummary> {
    const { data } = pfsenseVersionSchema.parse(await this.getJsonAsync(versionPath));
    return { version: data.version };
  }

  public async getFirewallUsageAsync() {
    const { data } = pfsenseSystemStatusSchema.parse(await this.getJsonAsync(systemStatusPath));
    const { cpu_usage: cpu, mem_usage: memory } = data;
    return {
      cpu: cpu === null ? null : { total: cpu },
      // pfREST only reports memory usage as a percentage.
      memory: memory === null ? null : { used: memory, total: 100, percent: memory },
    };
  }

  private getInterfacesChannel() {
    return createChannelEventHistoryOld<FirewallInterface[]>(`integration:${this.integration.id}:interfaces`, 15);
  }

  public async getFirewallInterfacesAsync(): Promise<FirewallInterfacesSummary[]> {
    const channel = this.getInterfacesChannel();
    const { data } = pfsenseInterfacesSchema.parse(await this.getJsonAsync(interfacesPath));

    await channel.pushAsync(
      data.flatMap(({ name, descr, inbytes, outbytes }) => {
        const label = descr || name;
        if (!label || inbytes == null || outbytes == null) return [];
        return [{ name: label, receive: inbytes, transmit: outbytes }];
      }),
    );

    return await channel.getSliceAsync(0, 1);
  }
}
