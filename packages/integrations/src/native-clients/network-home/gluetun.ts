import { ResponseError } from "@homarr/common/response-error";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import {
  gluetunDnsStatusSchema,
  gluetunPublicIpSchema,
  gluetunVpnSettingsSchema,
  gluetunVpnStatusSchema,
} from "../../gluetun/gluetun-types";
import type { VpnSummary } from "../../interfaces/vpn-summary/vpn-summary-types";
import { NetworkHomeProtocol } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

export class GluetunProtocol extends NetworkHomeProtocol {
  async getSummaryAsync(): Promise<VpnSummary> {
    return this.runAsync(async (http) => {
      const headers = this.authHeaders();
      const results = await Promise.allSettled([
        http.responseAsync(this.url("/v1/vpn/status"), { headers }, async (response) => {
          if (!response.ok) throw new ResponseError(response);
          return gluetunVpnStatusSchema.parse(await response.json());
        }),
        http.responseAsync(this.url("/v1/dns/status"), { headers }, async (response) => {
          if (!response.ok) throw new ResponseError(response);
          return gluetunDnsStatusSchema.parse(await response.json());
        }),
        http.responseAsync(this.url("/v1/publicip/ip"), { headers }, async (response) => {
          if (!response.ok) throw new ResponseError(response);
          return gluetunPublicIpSchema.parse(await response.json());
        }),
        http.responseAsync(this.url("/v1/vpn/settings"), { headers }, async (response) => {
          if (!response.ok) throw new ResponseError(response);
          return gluetunVpnSettingsSchema.parse(await response.json());
        }),
      ]);
      const [vpnStatus, dnsStatus, publicIp, settings] = results;
      if (vpnStatus.status === "rejected") throw vpnStatus.reason;
      if (dnsStatus.status === "rejected") throw dnsStatus.reason;
      if (publicIp.status === "rejected") throw publicIp.reason;
      if (settings.status === "rejected") throw settings.reason;
      return {
        vpnStatus: vpnStatus.value.status,
        dnsStatus: dnsStatus.value.status,
        publicIp: publicIp.value.public_ip,
        country: publicIp.value.country,
        city: publicIp.value.city,
        vpnProvider: { protocol: settings.value.type, provider: settings.value.provider.name },
      };
    });
  }

  protected async testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult> {
    return http.responseAsync(this.url("/v1/vpn/status"), { headers: this.authHeaders() }, async (response) =>
      response.ok ? { success: true } : TestConnectionError.StatusResult(response),
    );
  }

  private authHeaders(): Record<string, string> {
    if (this.hasSecret("apiKey")) return { "X-API-Key": this.secret("apiKey") };
    if (this.hasSecret("username") && this.hasSecret("password"))
      return { Authorization: `Basic ${btoa(`${this.secret("username")}:${this.secret("password")}`)}` };
    return {};
  }
}
