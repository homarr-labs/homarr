import type tls from "node:tls";
import axios from "axios";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";

import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import {
  createCustomCheckServerIdentity,
  fetchWithTrustedCertificatesAsync,
  getHttpRequestSignal,
} from "@homarr/core/infrastructure/http";
import type { SiteStats } from "@homarr/node-unifi";
import Unifi from "@homarr/node-unifi";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationAxiosHttpErrorHandler } from "../base/errors/http";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { createSessionStore } from "../base/session-store";
import type { IntegrationHttpAuthentication } from "../http-auth";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { NetworkControllerSummaryIntegration } from "../interfaces/network-controller-summary/network-controller-summary-integration";
import type { NetworkControllerSummary } from "../interfaces/network-controller-summary/network-controller-summary-types";
import type { HealthSubsystem } from "./unifi-controller-types";

@HandleIntegrationErrors([integrationAxiosHttpErrorHandler])
export class UnifiControllerIntegration extends Integration implements NetworkControllerSummaryIntegration {
  private readonly httpSessionStore = createSessionStore<{ cookie: string; csrfToken?: string }>(this.integration);

  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    let session = await this.httpSessionStore.getAsync();
    if (!session) {
      session = await this.loginForHttpRequestsAsync();
      await this.httpSessionStore.setAsync(session, { ttlSeconds: 300 });
    }
    const headers: Record<string, string> = { Cookie: session.cookie };
    if (session.csrfToken) headers["X-CSRF-Token"] = session.csrfToken;
    const redactValues = [session.cookie];
    if (session.csrfToken) redactValues.push(session.csrfToken);
    return { headers, redactValues };
  }

  public async getNetworkSummaryAsync(): Promise<NetworkControllerSummary> {
    const client = await this.createControllerClientAsync();
    const stats = await client.getSitesStats();

    return {
      wanStatus: this.getStatusValueOverAllSites(stats, "wan", (site) => site.status === "ok"),
      www: {
        status: this.getStatusValueOverAllSites(stats, "wan", (site) => site.status === "ok"),
        latency: this.getNumericValueOverAllSites(stats, "www", (site) => site.latency, "max"),
        ping: this.getNumericValueOverAllSites(stats, "www", (site) => site.speedtest_ping, "max"),
        uptime: this.getNumericValueOverAllSites(stats, "www", (site) => site.uptime, "max"),
      },
      wifi: {
        status: this.getStatusValueOverAllSites(stats, "wlan", (site) => site.status === "ok"),
        users: this.getNumericValueOverAllSites(stats, "wlan", (site) => site.num_user, "sum"),
        guests: this.getNumericValueOverAllSites(stats, "wlan", (site) => site.num_guest, "sum"),
      },
      lan: {
        status: this.getStatusValueOverAllSites(stats, "lan", (site) => site.status === "ok"),
        users: this.getNumericValueOverAllSites(stats, "lan", (site) => site.num_user, "sum"),
        guests: this.getNumericValueOverAllSites(stats, "lan", (site) => site.num_guest, "sum"),
      },
      vpn: {
        status: this.getStatusValueOverAllSites(stats, "vpn", (site) => site.status === "ok"),
        users: this.getNumericValueOverAllSites(stats, "vpn", (site) => site.remote_user_num_active, "sum"),
      },
    } satisfies NetworkControllerSummary;
  }

  protected async testingAsync({ options }: IntegrationTestingInput): Promise<TestingResult> {
    const client = await this.createControllerClientAsync(options);
    await client.getSitesStats();
    return { success: true };
  }

  private async loginForHttpRequestsAsync(): Promise<{ cookie: string; csrfToken?: string }> {
    const integrationUrl = new URL(this.integration.url);
    if (integrationUrl.protocol !== "https:") {
      throw new Error("UniFi generic HTTP requests require an HTTPS integration URL to protect the session cookie");
    }

    // Use the saved origin exactly. Generic requests target the saved URL, so falling back
    // to another port would bind the cookie to a different origin than the later request.
    const loginUrl = new URL(integrationUrl);
    loginUrl.pathname = "/api/auth/login";
    loginUrl.search = "";
    loginUrl.hash = "";
    let response = await fetchWithTrustedCertificatesAsync(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
      }),
      redirect: "error",
    });

    if (response.status === 404) {
      loginUrl.pathname = "/api/login";
      response = await fetchWithTrustedCertificatesAsync(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          username: this.getSecretValue("username"),
          password: this.getSecretValue("password"),
        }),
        redirect: "error",
      });
    }

    if (!response.ok) throw new Error("UniFi controller authentication failed");
    const cookies = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";", 1)[0])
      .filter(Boolean);
    if (cookies.length === 0) throw new Error("UniFi controller did not return a session cookie");

    const csrfToken = response.headers.get("x-csrf-token") ?? undefined;
    return { cookie: cookies.join("; "), ...(csrfToken ? { csrfToken } : {}) };
  }

  private async createControllerClientAsync(options?: {
    ca: string | string[];
    checkServerIdentity: typeof tls.checkServerIdentity;
  }) {
    const url = new URL(this.integration.url);
    const certificateOptions = options ?? {
      ca: await getAllTrustedCertificatesAsync(),
      checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    };

    // node-unifi always connects over HTTPS, regardless of the protocol in the
    // integration URL. UniFi OS consoles use port 443 while self-hosted controllers normally
    // use 8443. If no port was provided, try both without hiding authentication errors.
    const ports = url.port ? [Number(url.port)] : [443, 8443];
    const createClientForPortAsync = async (port: number) => {
      const client = new Unifi.Controller({
        host: url.hostname,
        port,
        username: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
        createAxiosInstance({ cookies }) {
          return axios.create({
            adapter: "http",
            signal: getHttpRequestSignal(),
            httpAgent: new HttpCookieAgent({ cookies }),
            httpsAgent: new HttpsCookieAgent({
              cookies,
              requestCert: true,
              ...certificateOptions,
            }),
          });
        },
      });

      await client.login(this.getSecretValue("username"), this.getSecretValue("password"), null);
      return client;
    };

    for (const [index, port] of ports.entries()) {
      try {
        return await createClientForPortAsync(port);
      } catch (error) {
        const isLastPort = index === ports.length - 1;
        if (isLastPort || !this.isPortFallbackError(error)) {
          throw error;
        }
      }
    }

    throw new Error("Unable to connect to the UniFi controller");
  }

  private isPortFallbackError(error: unknown) {
    if (typeof error === "object" && error !== null && "isAxiosError" in error && error.isAxiosError === true) {
      return !("response" in error) || error.response === undefined;
    }

    return error instanceof Error && error.message === "failed to detect UniFiOS status";
  }

  private getStatusValueOverAllSites<S extends HealthSubsystem>(
    data: SiteStats[],
    subsystem: S,
    selectCallback: (obj: SiteStats["health"][number]) => boolean,
  ) {
    return this.getBooleanValueOverAllSites(data, subsystem, selectCallback) ? "enabled" : "disabled";
  }

  private getNumericValueOverAllSites<
    S extends HealthSubsystem,
    T extends Extract<SiteStats["health"][number], { subsystem: S }>,
  >(data: SiteStats[], subsystem: S, selectCallback: (obj: T) => number, strategy: "average" | "sum" | "max"): number {
    const values = data.map((site) => selectCallback(this.getSubsystem(site.health, subsystem) as T));

    if (strategy === "sum") {
      return values.reduce((first, second) => first + second, 0);
    }

    if (strategy === "average") {
      return values.reduce((first, second, _, array) => first + second / array.length, 0);
    }

    return Math.max(...values);
  }

  private getBooleanValueOverAllSites(
    data: SiteStats[],
    subsystem: HealthSubsystem,
    selectCallback: (obj: SiteStats["health"][number]) => boolean,
  ): boolean {
    return data.every((site) => selectCallback(this.getSubsystem(site.health, subsystem)));
  }

  private getSubsystem(health: SiteStats["health"], subsystem: HealthSubsystem) {
    const value = health.find((health) => health.subsystem === subsystem);
    if (!value) {
      throw new Error(`Subsystem ${subsystem} not found!`);
    }
    return value;
  }
}
