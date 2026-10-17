import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { VpnSummaryIntegration } from "../interfaces/vpn-summary/vpn-summary-integration";
import type { VpnSummary } from "../interfaces/vpn-summary/vpn-summary-types";
import { gluetunPublicIpSchema, gluetunVpnStatusSchema } from "./gluetun-types";
import type { GluetunPublicIp, GluetunVpnStatus } from "./gluetun-types";

export class GluetunIntegration extends Integration implements VpnSummaryIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const authHeaders = this.getAuthHeaders();
    const url = this.url("/v1/vpn/status");
    const response = await input.fetchAsync(url, {
      headers: authHeaders,
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return { success: true };
  }

  public async getSummaryAsync(): Promise<VpnSummary> {
    const authHeaders = this.getAuthHeaders();
    const [vpnStatus, publicIp] = await Promise.all([
      this.getVpnStatusAsync(authHeaders),
      this.getPublicIpAsync(authHeaders),
    ]);

    return {
      vpnStatus: vpnStatus.status,
      publicIp: publicIp.public_ip,
      country: publicIp.country,
      city: publicIp.city,
    };
  }

  private async getVpnStatusAsync(authHeaders: Record<string, string>): Promise<GluetunVpnStatus> {
    const url = this.url("/v1/vpn/status");

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: authHeaders,
    });

    if (!response.ok) throw new ResponseError(response);
    return gluetunVpnStatusSchema.parse(await response.json());
  }

  private async getPublicIpAsync(authHeaders: Record<string, string>): Promise<GluetunPublicIp> {
    const url = this.url("/v1/publicip/ip");

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: authHeaders,
    });

    if (!response.ok) throw new ResponseError(response);
    return gluetunPublicIpSchema.parse(await response.json());
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.hasSecretValue("apiKey")) {
      return { "X-API-Key": this.getSecretValue("apiKey") };
    }

    if (this.hasSecretValue("username") && this.hasSecretValue("password")) {
      const username = this.getSecretValue("username");
      const password = this.getSecretValue("password");

      const encodedCredentials = btoa(`${username}:${password}`);

      return { Authorization: `Basic ${encodedCredentials}` };
    }

    return {};
  }
}
