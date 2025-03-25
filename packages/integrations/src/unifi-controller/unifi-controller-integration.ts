import type z from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { Integration, throwErrorByStatusCode } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { NetworkControllerSummaryIntegration } from "../interfaces/network-controller-summary/network-controller-summary-integration";
import type { NetworkControllerSummary } from "../interfaces/network-controller-summary/network-controller-summary-types";
import { unifiSummaryResponseSchema } from "./unifi-controller-types";
import { ParseError } from "../base/error";

const udmpPrefix = "proxy/network";
type Subsystem = "www" | "wan" | "wlan" | "lan" | "vpn";

export class UnifiControllerIntegration extends Integration implements NetworkControllerSummaryIntegration {
  private prefix: string | undefined;

  public async getNetworkSummaryAsync(): Promise<NetworkControllerSummary> {
    if (!this.headers) {
      await this.authenticateAndConstructSessionInHeaderAsync();
    }

    const requestUrl = this.url(`/${this.prefix}/api/stat/sites`);

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.headers,
    };
    if (this.csrfToken) {
      requestHeaders["X-CSRF-TOKEN"] = this.csrfToken;
    }

    const statsResponse = await fetchWithTrustedCertificatesAsync(requestUrl, {
      method: "GET",
      headers: {
        ...requestHeaders,
      },
    }).catch((err: TypeError) => {
      const detailMessage = String(err.cause);
      throw new IntegrationTestConnectionError("invalidUrl", detailMessage);
    });

    if (!statsResponse.ok) {
      throwErrorByStatusCode(statsResponse.status);
    }

    const result = unifiSummaryResponseSchema.safeParse(await statsResponse.json());

    if (!result.success) {
      throw new ParseError('Unifi controller', result.error);
    }

    return {
      wanStatus: this.getStatusValueOverAllSites(result.data, "wan", (site) => site.status === "ok"),
      www: {
        status: this.getStatusValueOverAllSites(result.data, "wan", (site) => site.status === "ok"),
        latency: this.getNumericValueOverAllSites(result.data, "www", (site) => site.latency, "max"),
        ping: this.getNumericValueOverAllSites(result.data, "www", (site) => site.speedtest_ping, "max"),
        uptime: this.getNumericValueOverAllSites(result.data, "www", (site) => site.uptime, "max"),
      },
      wifiStatus: this.getStatusValueOverAllSites(result.data, "wlan", (site) => site.status === "ok"),
      wifiUsers: this.getNumericValueOverAllSites(result.data, "wlan", (site) => site.num_user, "sum"),
      wifiGuests: this.getNumericValueOverAllSites(result.data, "wlan", (site) => site.num_guest, "sum"),
      lanStatus: this.getStatusValueOverAllSites(result.data, "lan", (site) => site.status === "ok"),
      lanUsers: this.getNumericValueOverAllSites(result.data, "lan", (site) => site.num_user, "sum"),
      lanGuests: this.getNumericValueOverAllSites(result.data, "lan", (site) => site.num_guest, "sum"),
      vpnStatus: this.getStatusValueOverAllSites(result.data, "vpn", (site) => site.status === "ok"),
      vpnUsers: this.getNumericValueOverAllSites(result.data, "vpn", (site) => site.remote_user_num_active, "sum"),
    } satisfies NetworkControllerSummary;
  }

  public async testConnectionAsync(): Promise<void> {
    await this.authenticateAndConstructSessionInHeaderAsync();
  }

  private getStatusValueOverAllSites(
    data: z.infer<typeof unifiSummaryResponseSchema>,
    subsystem: Subsystem,
    selectCallback: (obj: z.infer<typeof unifiSummaryResponseSchema>["data"][number]["health"][number]) => boolean,
  ) {
    return this.getBooleanValueOverAllSites(data, subsystem, selectCallback) ? "enabled" : "disabled";
  }

  private getNumericValueOverAllSites<
    S extends Subsystem,
    T extends Extract<z.infer<typeof unifiSummaryResponseSchema>["data"][number]["health"][number], { subsystem: S }>,
  >(
    data: z.infer<typeof unifiSummaryResponseSchema>,
    subsystem: S,
    selectCallback: (obj: T) => number,
    strategy: "average" | "sum" | "max",
  ): number {
    const values = data.data.map((site) => selectCallback(this.getSubsystem(site.health, subsystem) as T));

    if (strategy === "sum") {
      return values.reduce((first, second) => first + second, 0);
    }

    if (strategy === "average") {
      return values.reduce((first, second, _, array) => first + second / array.length, 0);
    }

    return Math.max(...values);
  }

  private getBooleanValueOverAllSites(
    data: z.infer<typeof unifiSummaryResponseSchema>,
    subsystem: Subsystem,
    selectCallback: (obj: z.infer<typeof unifiSummaryResponseSchema>["data"][number]["health"][number]) => boolean,
  ): boolean {
    return data.data.every((site) => selectCallback(this.getSubsystem(site.health, subsystem)));
  }

  private getSubsystem(
    health: z.infer<typeof unifiSummaryResponseSchema>["data"][number]["health"],
    subsystem: Subsystem,
  ) {
    const value = health.find((health) => health.subsystem === subsystem);
    if (!value) {
      throw new Error(`Subsystem ${subsystem} not found!`);
    }
    return value;
  }

  private headers: Record<string, string> | undefined = undefined;
  private csrfToken: string | undefined;

  private async authenticateAndConstructSessionInHeaderAsync(): Promise<void> {
    await this.determineUDMVariantAsync();
    await this.authenticateAndSetCookieAsync();
  }

  private async authenticateAndSetCookieAsync(): Promise<void> {
    if (this.headers) {
      return;
    }

    const endpoint = this.prefix === udmpPrefix ? "auth/login" : "login";
    logger.debug("Authenticating at network console: " + endpoint);

    const loginUrl = this.url(`/api/${endpoint}`);

    const loginBody = {
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
      remember: true,
    };

    const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (this.csrfToken) {
      requestHeaders["X-CSRF-TOKEN"] = this.csrfToken;
    }

    const loginResponse = await fetchWithTrustedCertificatesAsync(loginUrl, {
      method: "POST",
      headers: {
        ...requestHeaders,
      },
      body: JSON.stringify(loginBody),
    }).catch((err: TypeError) => {
      const detailMessage = String(err.cause);
      throw new IntegrationTestConnectionError("invalidUrl", detailMessage);
    });

    if (!loginResponse.ok) {
      throwErrorByStatusCode(loginResponse.status);
    }

    const responseHeaders = loginResponse.headers;
    const newHeaders: Record<string, string> = {};
    const loginToken = UnifiControllerIntegration.extractLoginTokenFromCookies(responseHeaders);
    newHeaders.Cookie = `${loginToken};`;
    this.headers = newHeaders;
  }

  private async determineUDMVariantAsync(): Promise<void> {
    if (this.prefix) {
      return;
    }

    logger.debug("Prefix for authentication not set; initial connect to determine UDM variant");
    const url = this.url("/");

    const { status, ok, headers } = await fetchWithTrustedCertificatesAsync(url, { method: "HEAD" })
      .then((res) => res)
      .catch((err: TypeError) => {
        const detailMessage = String(err.cause);
        throw new IntegrationTestConnectionError("invalidUrl", detailMessage);
      });

    if (!ok) {
      throw new IntegrationTestConnectionError("invalidUrl", "status code: " + status);
    }

    let prefix = "";
    if (headers.get("x-csrf-token") !== null) {
      // Unifi OS < 3.2.5 passes & requires csrf-token
      prefix = udmpPrefix;
      const headersCSRFToken = headers.get("x-csrf-token");
      if (headersCSRFToken) {
        this.csrfToken = headersCSRFToken;
      }
    } else if (headers.get("access-control-expose-headers") !== null) {
      // Unifi OS ≥ 3.2.5 doesnt pass csrf token but still uses different endpoint
      prefix = udmpPrefix;
    }
    this.prefix = prefix;
    logger.debug("Final prefix: " + this.prefix);
  }

  private static extractLoginTokenFromCookies(headers: Headers): string {
    const cookies = headers.get("set-cookie") ?? "";
    const loginToken = cookies.split(";").find((cookie) => cookie.includes("TOKEN"));

    if (loginToken) {
      return loginToken;
    }

    throw new Error("Login token not found in cookies");
  }
}
