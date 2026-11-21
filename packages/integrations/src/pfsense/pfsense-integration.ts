import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createChannelEventHistoryOld } from "@homarr/redis";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { FirewallSummaryIntegration } from "../interfaces/firewall-summary/firewall-summary-integration";
import type {
  FirewallCpuSummary,
  FirewallInterface,
  FirewallInterfacesSummary,
  FirewallMemorySummary,
  FirewallVersionSummary,
} from "../interfaces/firewall-summary/firewall-summary-types";
import { pfsenseInterfacesSchema, pfsenseSystemStatusSchema, pfsenseVersionSchema } from "./pfsense-types";

export class PfSenseIntegration extends Integration implements FirewallSummaryIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/v2/system/version"), {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) return TestConnectionError.StatusResult(response);

    const result = pfsenseVersionSchema.safeParse(await response.json());
    if (result.success) return { success: true };

    return TestConnectionError.ParseResult(new ParseError("Unexpected pfSense REST API response"));
  }

  private getAuthHeaders() {
    return { "x-api-key": super.getSecretValue("apiKey") };
  }

  private async getJsonAsync(path: `/${string}`) {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path), {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new ResponseError(response);
    }
    return (await response.json()) as unknown;
  }

  public async getFirewallVersionAsync(): Promise<FirewallVersionSummary> {
    const { data } = pfsenseVersionSchema.parse(await this.getJsonAsync("/api/v2/system/version"));
    return { version: data.version };
  }

  public async getFirewallCpuAsync(): Promise<FirewallCpuSummary> {
    const { data } = pfsenseSystemStatusSchema.parse(await this.getJsonAsync("/api/v2/status/system"));
    return { total: data.cpu_usage };
  }

  public async getFirewallMemoryAsync(): Promise<FirewallMemorySummary> {
    const { data } = pfsenseSystemStatusSchema.parse(await this.getJsonAsync("/api/v2/status/system"));
    // The pfSense REST API only reports memory usage as a percentage.
    return { used: data.mem_usage, total: 100, percent: data.mem_usage };
  }

  private getInterfacesChannel() {
    return createChannelEventHistoryOld<FirewallInterface[]>(`integration:${this.integration.id}:interfaces`, 15);
  }

  public async getFirewallInterfacesAsync(): Promise<FirewallInterfacesSummary[]> {
    const channel = this.getInterfacesChannel();
    const { data } = pfsenseInterfacesSchema.parse(await this.getJsonAsync("/api/v2/status/interfaces"));

    await channel.pushAsync(
      data.flatMap(({ name, descr, inbytes, outbytes }) =>
        typeof inbytes === "number" && typeof outbytes === "number"
          ? [{ name: descr || name, receive: inbytes, transmit: outbytes }]
          : [],
      ),
    );

    return await channel.getSliceAsync(0, 1);
  }
}
