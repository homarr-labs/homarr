import type { Response as UndiciResponse } from "undici";
import type { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { extractErrorMessage } from "@homarr/common";
import { logger } from "@homarr/log";

import { IntegrationResponseError, ParseError, ResponseError } from "../../base/error";
import type { IntegrationInput } from "../../base/integration";
import { Integration } from "../../base/integration";
import type { SessionStore } from "../../base/session-store";
import { createSessionStore } from "../../base/session-store";
import { IntegrationTestConnectionError } from "../../base/test-connection-error";
import type { DnsHoleSummaryIntegration } from "../../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { DnsHoleSummary } from "../../types";
import { dnsBlockingGetSchema, sessionResponseSchema, statsSummaryGetSchema } from "./pi-hole-schemas-v6";

const localLogger = logger.child({ module: "PiHoleIntegrationV6" });

export class PiHoleIntegrationV6 extends Integration implements DnsHoleSummaryIntegration {
  private readonly sessionStore: SessionStore<string>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

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
      throw new ParseError("DNS blocking status", result.error, await response.json());
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
      domainsBeingBlocked: dnsStatsSummary.gravity.domains_being_blocked,
      dnsQueriesToday: dnsStatsSummary.queries.total,
    };
  }

  public async testingAsync(): Promise<void> {
    try {
      const sessionId = await this.getSessionAsync();
      await this.clearSessionAsync(sessionId);
    } catch (error: unknown) {
      if (error instanceof ParseError) {
        throw new IntegrationTestConnectionError("invalidJson");
      }

      if (error instanceof ResponseError && error.statusCode === 401) {
        throw new IntegrationTestConnectionError("invalidCredentials");
      }

      throw new IntegrationTestConnectionError("commonError", extractErrorMessage(error));
    }
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

  /**
   * Run the callback with the current session id
   * @param callback
   * @returns
   */
  private async withAuthAsync(callback: (sessionId: string) => Promise<UndiciResponse>) {
    const storedSession = await this.sessionStore.getAsync();

    if (storedSession) {
      localLogger.debug("Using stored session for request", { integrationId: this.integration.id });
      const response = await callback(storedSession);
      if (response.status !== 401) {
        return response;
      }

      localLogger.info("Session expired, getting new session", { integrationId: this.integration.id });
    }

    const sessionId = await this.getSessionAsync();
    await this.sessionStore.setAsync(sessionId);
    const response = await callback(sessionId);
    return response;
  }

  /**
   * Get a session id from the Pi-hole server
   * @returns The session id
   */
  private async getSessionAsync(): Promise<string> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/auth"), {
      method: "POST",
      body: JSON.stringify({ password: apiKey }),
      headers: {
        "User-Agent": "Homarr",
      },
    });
    const data = await response.json();
    const result = sessionResponseSchema.safeParse(data);
    if (!result.success) {
      throw new ParseError("session response", result.error, data);
    }
    if (!result.data.session.sid) {
      throw new IntegrationResponseError(this.integration, response, data);
    }

    localLogger.info("Received session id successfully", { integrationId: this.integration.id });

    return result.data.session.sid;
  }

  /**
   * Remove the session from the Pi-hole server
   * @param sessionId The session id to remove
   */
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

    logger.debug("Cleared session successfully");
  }
}
