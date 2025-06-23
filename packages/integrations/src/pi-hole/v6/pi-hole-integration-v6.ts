import type { fetch as undiciFetch, Response as UndiciResponse } from "undici";
import type { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { ResponseError } from "@homarr/common/server";
import { logger } from "@homarr/log";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { Integration } from "../../base/integration";
import type { SessionStore } from "../../base/session-store";
import { createSessionStore } from "../../base/session-store";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
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
      throw new ResponseError(response);
    }

    const result = await dnsBlockingGetSchema.parseAsync(await response.json());

    return result;
  }

  private async getStatsSummaryAsync(): Promise<z.infer<typeof statsSummaryGetSchema>> {
    const response = await this.withAuthAsync(async (sessionId) => {
      return fetchWithTrustedCertificatesAsync(this.url("/api/stats/summary"), {
        headers: {
          sid: sessionId,
        },
      });
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = await response.json();
    const result = await statsSummaryGetSchema.parseAsync(data);

    return result;
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

  protected async testingAsync({ fetchAsync }: IntegrationTestingInput): Promise<TestingResult> {
    const sessionId = await this.getSessionAsync(fetchAsync);
    await this.clearSessionAsync(sessionId, fetchAsync);
    await this.sessionStore.clearAsync();
    return { success: true };
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
      throw new ResponseError(response);
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
      throw new ResponseError(response);
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
  private async getSessionAsync(fetchAsync: typeof undiciFetch = fetchWithTrustedCertificatesAsync): Promise<string> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetchAsync(this.url("/api/auth"), {
      method: "POST",
      body: JSON.stringify({ password: apiKey }),
      headers: {
        "User-Agent": "Homarr",
      },
    });

    if (!response.ok) throw new ResponseError(response);

    const data = await response.json();
    const result = await sessionResponseSchema.parseAsync(data);

    if (!result.session.sid) {
      throw new ResponseError({ status: 401, url: response.url });
    }

    localLogger.info("Received session id successfully", { integrationId: this.integration.id });

    return result.session.sid;
  }

  /**
   * Remove the session from the Pi-hole server
   * @param sessionId The session id to remove
   */
  private async clearSessionAsync(
    sessionId: string,
    fetchAsync: typeof undiciFetch = fetchWithTrustedCertificatesAsync,
  ) {
    const response = await fetchAsync(this.url("/api/auth"), {
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
