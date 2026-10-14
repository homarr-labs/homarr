import { isAxiosError } from "axios";
import { z } from "zod/v4";

import type { SiteStats } from "@homarr/node-unifi";
import type Unifi from "@homarr/node-unifi";

import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { NetworkControllerSummary } from "../../interfaces/network-controller-summary/network-controller-summary-types";
import { IntegrationTransportRequestError, sanitizeIntegrationTransportError } from "../../runtime/transport-errors";
import { NetworkHomeCapabilityHeldError, NetworkHomeProtocol, settleNetworkHomeAsync } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

type Health = SiteStats["health"][number];
type Subsystem = Health["subsystem"];

const subsystem = <S extends Subsystem>(site: SiteStats, name: S): Extract<Health, { subsystem: S }> => {
  const value = site.health.find((entry): entry is Extract<Health, { subsystem: S }> => entry.subsystem === name);
  if (!value) throw new Error(`Subsystem ${name} not found!`);
  return value;
};

const status = (sites: SiteStats[], name: Subsystem): "enabled" | "disabled" =>
  sites.every((site) => subsystem(site, name).status === "ok") ? "enabled" : "disabled";

export const countUnifiRemoteVpnSessions = (value: unknown): number =>
  z
    .array(z.object({ up: z.boolean() }))
    .parse(value)
    .filter((session) => session.up).length;

export const countUnifiVpnHealthUsers = (site: SiteStats): number => subsystem(site, "vpn").remote_user_num_active;

export const mapUnifiNetworkSummary = (
  sites: SiteStats[],
  vpnUserCounts: (number | null)[],
): NetworkControllerSummary => {
  let vpnUsers: number | null = 0;
  for (const count of vpnUserCounts) {
    if (count === null) {
      vpnUsers = null;
      break;
    }
    vpnUsers += count;
  }
  return {
    wanStatus: status(sites, "wan"),
    www: {
      status: status(sites, "wan"),
      latency: Math.max(...sites.map((site) => subsystem(site, "www").latency)),
      ping: Math.max(...sites.map((site) => subsystem(site, "www").speedtest_ping)),
      uptime: Math.max(...sites.map((site) => subsystem(site, "www").uptime)),
    },
    wifi: {
      status: status(sites, "wlan"),
      users: sites.reduce((sum, site) => sum + subsystem(site, "wlan").num_user, 0),
      guests: sites.reduce((sum, site) => sum + subsystem(site, "wlan").num_guest, 0),
    },
    lan: {
      status: status(sites, "lan"),
      users: sites.reduce((sum, site) => sum + subsystem(site, "lan").num_user, 0),
      guests: sites.reduce((sum, site) => sum + subsystem(site, "lan").num_guest, 0),
    },
    vpn: { status: status(sites, "vpn"), users: vpnUsers },
  };
};

export const unifiControllerPorts = (url: URL): number[] => (url.port ? [Number(url.port)] : [443, 8443]);

export const isUnifiPortFallbackError = (error: unknown): boolean => {
  if (error instanceof NetworkHomeCapabilityHeldError || error instanceof AggregateError) return false;
  if (
    error instanceof Error &&
    ["AbortError", "TimeoutError", "IntegrationBindingError", "IntegrationRuntimeError"].includes(error.name)
  )
    return false;
  const sanitized = sanitizeIntegrationTransportError(error);
  if (sanitized instanceof IntegrationTransportRequestError && sanitized.diagnostic.type === "certificate")
    return false;
  if (isAxiosError<unknown, unknown, unknown>(error))
    return error.code !== "ERR_CANCELED" && error.response === undefined;
  return error instanceof Error && error.message === "failed to detect UniFiOS status";
};

export class UnifiControllerProtocol extends NetworkHomeProtocol {
  override async testConnectionAsync(): Promise<TestingResult> {
    this.resources.context.signal.throwIfAborted();
    throw new NetworkHomeCapabilityHeldError("cookie-agent-sdk");
  }

  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    this.requireFencedSession();
    const session = await this.runAsync((http) => this.loginHttpCandidateAsync(http));
    const headers: Record<string, string> = { Cookie: session.cookie };
    const redactValues = [session.cookie];
    if (session.csrfToken) {
      headers["X-CSRF-Token"] = session.csrfToken;
      redactValues.push(session.csrfToken);
    }
    return { headers, redactValues };
  }

  async getNetworkSummaryAsync(): Promise<NetworkControllerSummary> {
    this.resources.context.signal.throwIfAborted();
    const client = await this.controllerUnavailableAsync();
    const sites = await client.getSitesStats();
    const vpnUserCounts = await settleNetworkHomeAsync(
      sites.map(async (site): Promise<number | null> => {
        try {
          const sessions: unknown = await client.customApiRequest(
            `/api/s/${encodeURIComponent(site.name)}/stat/remoteuservpn`,
          );
          return countUnifiRemoteVpnSessions(sessions);
        } catch (error) {
          this.rethrowProtectedFailure(error);
          if (isAxiosError<unknown, unknown, unknown>(error) && error.response?.status === 404)
            return countUnifiVpnHealthUsers(site);
          this.resources.log?.write("warn", "UniFi remote VPN session count unavailable", {
            integrationId: this.integration.id,
            site: site.name,
            status: isAxiosError<unknown, unknown, unknown>(error) ? error.response?.status : undefined,
            reason: error instanceof z.ZodError ? "invalid-response" : "request-failed",
          });
          return null;
        }
      }),
    );
    return mapUnifiNetworkSummary(sites, vpnUserCounts);
  }

  protected async testingAsync(_http: NetworkHomeHttpOperation): Promise<TestingResult> {
    const client = await this.controllerUnavailableAsync();
    await client.getSitesStats();
    return { success: true };
  }

  private async controllerUnavailableAsync(): Promise<InstanceType<typeof Unifi.Controller>> {
    throw new NetworkHomeCapabilityHeldError("cookie-agent-sdk");
  }

  private requireFencedSession(): void {
    throw new NetworkHomeCapabilityHeldError("fenced-session");
  }

  private async loginHttpCandidateAsync(
    http: NetworkHomeHttpOperation,
  ): Promise<{ cookie: string; csrfToken?: string }> {
    const url = new URL(this.integration.url);
    if (url.protocol !== "https:")
      throw new Error("UniFi generic HTTP requests require an HTTPS integration URL to protect the session cookie");
    url.pathname = "/api/auth/login";
    url.search = "";
    url.hash = "";
    const init = {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: this.secret("username"), password: this.secret("password") }),
    };
    const readSessionAsync = async (fallback: boolean) =>
      http.responseAsync(url, init, async (response) => {
        if (!fallback && response.status === 404) return null;
        if (!response.ok) throw new Error("UniFi controller authentication failed");
        const cookies = response.headers
          .getSetCookie()
          .map((cookie) => cookie.split(";", 1)[0])
          .filter(Boolean);
        if (cookies.length === 0) throw new Error("UniFi controller did not return a session cookie");
        const csrfToken = response.headers.get("x-csrf-token") ?? undefined;
        return { cookie: cookies.join("; "), ...(csrfToken ? { csrfToken } : {}) };
      });
    const session = await readSessionAsync(false);
    if (session) return session;
    this.resources.context.signal.throwIfAborted();
    url.pathname = "/api/login";
    const fallback = await readSessionAsync(true);
    if (!fallback) throw new Error("UniFi controller authentication failed");
    return fallback;
  }
}
