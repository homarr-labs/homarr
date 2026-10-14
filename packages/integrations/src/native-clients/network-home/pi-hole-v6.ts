import type { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";

import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { DnsHoleSummary } from "../../interfaces/dns-hole-summary/dns-hole-summary-types";
import {
  dnsBlockingGetSchema,
  sessionResponseSchema,
  statsSummaryGetSchema,
} from "../../pi-hole/v6/pi-hole-schemas-v6";
import { NetworkHomeCapabilityHeldError, NetworkHomeProtocol } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

export class PiHoleV6Protocol extends NetworkHomeProtocol {
  override async testConnectionAsync(): Promise<TestingResult> {
    this.resources.context.signal.throwIfAborted();
    throw new NetworkHomeCapabilityHeldError("fenced-session");
  }

  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    this.resources.context.signal.throwIfAborted();
    if (!this.hasSecret("apiKey")) return { headers: {} };
    this.requireFencedSession();
    return this.runAsync(async (http) => {
      const sid = await this.getSessionCandidateAsync(http);
      if (!sid) throw new Error("Pi-hole did not return an authenticated session");
      return { headers: { sid }, redactValues: [sid] };
    });
  }

  async getDnsBlockingStatusAsync(): Promise<z.infer<typeof dnsBlockingGetSchema>> {
    if (this.hasSecret("apiKey")) this.requireFencedSession();
    return this.runAsync((http) => this.getBlockingCandidateAsync(http, null));
  }

  async getSummaryAsync(): Promise<DnsHoleSummary> {
    if (this.hasSecret("apiKey")) this.requireFencedSession();
    return this.runAsync(async (http) => {
      const stats = await this.getStatsCandidateAsync(http, null);
      const blocking = await this.getBlockingCandidateAsync(http, null);
      return {
        status: blocking.blocking,
        adsBlockedToday: stats.queries.blocked,
        adsBlockedTodayPercentage: stats.queries.percent_blocked,
        domainsBeingBlocked: stats.gravity.domains_being_blocked,
        dnsQueriesToday: stats.queries.total,
      };
    });
  }

  async enableAsync(): Promise<void> {
    this.requireInteract();
    await this.setBlockingCandidateAsync(true);
  }

  async disableAsync(duration?: number): Promise<void> {
    this.requireInteract();
    await this.setBlockingCandidateAsync(false, duration);
  }

  protected async testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult> {
    this.requireFencedSession();
    const sid = await this.getSessionCandidateAsync(http);
    await this.clearSessionCandidateAsync(http, sid);
    throw new NetworkHomeCapabilityHeldError("fenced-session");
  }

  private requireFencedSession(): void {
    throw new NetworkHomeCapabilityHeldError("fenced-session");
  }

  private async getBlockingCandidateAsync(http: NetworkHomeHttpOperation, sid: string | null) {
    return http.responseAsync(this.url("/api/dns/blocking"), { headers: sid ? { sid } : {} }, async (response) => {
      if (!response.ok) throw new ResponseError(response);
      return dnsBlockingGetSchema.parseAsync(await response.json());
    });
  }

  private async getStatsCandidateAsync(http: NetworkHomeHttpOperation, sid: string | null) {
    return http.responseAsync(this.url("/api/stats/summary"), { headers: sid ? { sid } : {} }, async (response) => {
      if (!response.ok) throw new ResponseError(response);
      return statsSummaryGetSchema.parseAsync(await response.json());
    });
  }

  private async setBlockingCandidateAsync(blocking: boolean, timer?: number): Promise<void> {
    if (this.hasSecret("apiKey")) this.requireFencedSession();
    await this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/dns/blocking"),
        {
          method: "POST",
          headers: {},
          body: JSON.stringify(blocking ? { blocking: true } : { blocking: false, timer }),
        },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
        },
      ),
    );
  }

  private async getSessionCandidateAsync(http: NetworkHomeHttpOperation): Promise<string | null> {
    return http.responseAsync(
      this.url("/api/auth"),
      {
        method: "POST",
        body: JSON.stringify({ password: this.hasSecret("apiKey") ? this.secret("apiKey") : "" }),
        headers: { "User-Agent": "Homarr" },
      },
      async (response) => {
        if (!response.ok) throw new ResponseError(response);
        const result = await sessionResponseSchema.parseAsync(await response.json());
        if (!result.session.valid)
          throw new ResponseError(
            { status: 401, url: response.url },
            { cause: result.session.message ? new Error(result.session.message) : undefined },
          );
        this.resources.log?.write("debug", "Received session id successfully", { integrationId: this.integration.id });
        return result.session.sid;
      },
    );
  }

  private async clearSessionCandidateAsync(http: NetworkHomeHttpOperation, sid: string | null): Promise<void> {
    if (!sid) {
      this.resources.log?.write("debug", "No session id to clear", {});
      return;
    }
    await http.responseAsync(this.url("/api/auth"), { method: "DELETE", headers: { sid } }, async (response) => {
      if (!response.ok) {
        await response.text();
        this.resources.log?.write("warn", "Failed to clear session", { statusCode: response.status });
      }
      this.resources.log?.write("debug", "Cleared session successfully", {});
    });
  }
}
