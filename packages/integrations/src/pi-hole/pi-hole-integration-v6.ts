import { Response as UndiciResponse } from "undici";
import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { extractErrorMessage } from "@homarr/common";
import { logger } from "@homarr/log";

import { IntegrationResponseError, ParseError, ResponseError } from "../base/error";
import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { DnsHoleSummaryIntegration } from "../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { DnsHoleSummary } from "../types";

const localLogger = logger.child({ module: "PiHoleIntegrationV6" });

const sessionResponseSchema = z.object({
  session: z.object({
    sid: z.string().nullable(),
    message: z.string().nullable(),
  }),
});

const dnsBlockingGetSchema = z.object({
  blocking: z.enum(["enabled", "disabled", "failed", "unknown"]).transform((value) => {
    if (value === "failed") return undefined;
    if (value === "unknown") return undefined;
    return value;
  }),
  timer: z.number().nullable(),
});

const statsSummaryGetSchema = z.object({
  queries: z.object({
    total: z.number(),
    blocked: z.number(),
    percent_blocked: z.number(),
    unique_domains: z.number(),
  }),
});

export class PiHoleIntegrationV6 extends Integration implements DnsHoleSummaryIntegration {
  public async getDnsBlockingStatusAsync(): Promise<z.infer<typeof dnsBlockingGetSchema>> {
    const response = await this.withAuthAsync(async (sessionId) => {
      return await fetchWithTrustedCertificatesAsync(this.url("/api/dns/blocking"), {
        headers: {
          sid: sessionId,
        },
      });
    });

    if (!response.ok) {
      throw new IntegrationResponseError(this.integration, response, await response.json());
    }

    const result = dnsBlockingGetSchema.safeParse(await response.json());

    if (!result.success) {
      throw new ParseError("dns blocking status", result.error, await response.json());
    }

    return result.data;
  }

  private async getStatsSummaryAsync(): Promise<z.infer<typeof statsSummaryGetSchema>> {
    const response = await this.withAuthAsync(async (sessionId) => {
      return await fetchWithTrustedCertificatesAsync(this.url("/api/stats/summary"), {
        headers: {
          sid: sessionId,
        },
      });
    });

    if (!response.ok) {
      throw new IntegrationResponseError(this.integration, response, await response.json());
    }

    const data = await response.json();
    const result = statsSummaryGetSchema.safeParse(data);

    if (!result.success) {
      throw new ParseError("stats summary", result.error, data);
    }

    return result.data;
  }

  public async getSummaryAsync(): Promise<DnsHoleSummary> {
    const dnsStatsSummary = await this.getStatsSummaryAsync();
    const dnsBlockingStatus = await this.getDnsBlockingStatusAsync();

    return {
      status: dnsBlockingStatus.blocking,
      adsBlockedToday: dnsStatsSummary.queries.blocked,
      adsBlockedTodayPercentage: dnsStatsSummary.queries.percent_blocked,
      domainsBeingBlocked: dnsStatsSummary.queries.unique_domains,
      dnsQueriesToday: dnsStatsSummary.queries.total,
    };
  }

  public async testConnectionAsync(): Promise<void> {
    const result = await this.withAuthAsync(() => Promise.resolve(new UndiciResponse()))
      .then(() => ({ success: true as const }))
      .catch((error: unknown) => ({ error, success: false as const }));

    if (result.success) return;

    if (result.error instanceof ParseError) {
      throw new IntegrationTestConnectionError("invalidJson");
    }

    if (result.error instanceof ResponseError && result.error.statusCode === 401) {
      throw new IntegrationTestConnectionError("invalidCredentials");
    }

    throw new IntegrationTestConnectionError("commonError", extractErrorMessage(result.error));
  }

  public async enableAsync(): Promise<void> {
    const response = await this.withAuthAsync(async (sessionId) => {
      return await fetchWithTrustedCertificatesAsync(this.url("/api/dns/blocking"), {
        headers: {
          sid: sessionId,
        },
        body: JSON.stringify({ blocking: true }),
        method: "POST",
      });
    });

    if (!response.ok) {
      throw new IntegrationResponseError(this.integration, response, await response.json());
    }
  }

  public async disableAsync(duration?: number): Promise<void> {
    const response = await this.withAuthAsync(async (sessionId) => {
      return await fetchWithTrustedCertificatesAsync(this.url("/api/dns/blocking"), {
        headers: {
          sid: sessionId,
        },
        body: JSON.stringify({ blocking: false, timer: duration }),
        method: "POST",
      });
    });

    if (!response.ok) {
      throw new IntegrationResponseError(this.integration, response, await response.json());
    }
  }

  private async withAuthAsync(callback: (sessionId: string) => Promise<UndiciResponse>) {
    const sessionId = await this.getSessionAsync();
    const response = await callback(sessionId);

    // We need to remove this session as only 10 are allowed by default
    await this.clearSessionAsync(sessionId);

    return response;
  }

  private async getSessionAsync(): Promise<string> {
    const apiKey = super.getSecretValue("apiKey");
    console.log(`USING API KEY=${apiKey}`);
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/auth"), {
      method: "POST",
      body: JSON.stringify({ password: apiKey }),
    });
    const data = await response.json();
    const result = sessionResponseSchema.safeParse(data);
    if (!result.success) {
      throw new ParseError("session response", result.error, data);
    }
    if (!result.data.session.sid) {
      throw new IntegrationResponseError(this.integration, response, data);
    }

    localLogger.debug("Received session id successfully");

    return result.data.session.sid;
  }

  private async clearSessionAsync(sessionId: string) {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/auth"), {
      method: "DELETE",
      headers: {
        sid: sessionId,
      },
    });

    if (!response.ok) {
      localLogger.warn("Failed to clear session", { statusCode: response.status, content: await response.text() });
    }
  }
}
