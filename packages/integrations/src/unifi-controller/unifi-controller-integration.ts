import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { NetworkControllerSummaryIntegration } from "../interfaces/network-controller-summary/network-controller-summary-integration";
import type { NetworkControllerSummary } from "../interfaces/network-controller-summary/network-controller-summary-types";
import { throwErrorByStatusCode } from "./unifi-controller-ErrorByStatusCode";
import { unifiSummaryResponseSchema } from "./unifi-controller-types";

const udmpPrefix = "proxy/network";

export class UnifiControllerIntegration extends Integration implements NetworkControllerSummaryIntegration {
  private prefix: string | undefined;

  static extractLoginTokenFromCookies(headers: Headers): string {
    const cookies = headers.get("set-cookie") ?? "";
    const loginToken = cookies.split(";").find((cookie) => cookie.includes("TOKEN"));

    if (loginToken) {
      return loginToken;
    } else {
      throw new Error("Login token not found in cookies");
    }
  }

  public async getNetworkSummaryAsync(): Promise<NetworkControllerSummary> {
    if (!this.headers) {
      await this.authenticateAndConstructSessionInHeaderAsync();
    }

    const requestUrl = this.url(`/${this.prefix}/api/stat/sites`);
    logger.debug("getNetworkSummaryAsync constructed requestUrl: " + requestUrl.toString());

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
      throw new Error("Error parsing response from unifi controller.", result.error);
    }

    const summary: NetworkControllerSummary = {
      wanStatus: "disabled",

      wwwStatus: "disabled",
      wwwLatency: -1,
      wwwPing: -1,
      wwwUptime: -1,

      wifiStatus: "disabled",
      wifiUsers: -1,
      wifiGuests: -1,

      lanStatus: "disabled",
      lanUsers: -1,
      lanGuests: -1,

      vpnStatus: "disabled",
      vpnUsers: -1,
    };

    for (const site of result.data.data) {
      if (site.name !== "default") {
        break;
      }

      for (const health of site.health) {
        switch (health.subsystem) {
          case "wan":
            if (health.status === "ok") {
              summary.wanStatus = "enabled";
            }
            break;
          case "www":
            if (health.status === "ok") {
              summary.wwwStatus = "enabled";
            }
            summary.wwwLatency = health.latency;
            summary.wwwPing = health.speedtest_ping;
            summary.wwwUptime = health.uptime;
            break;
          case "wlan":
            if (health.status === "ok") {
              summary.wifiStatus = "enabled";
            }
            summary.wifiUsers = health.num_user;
            summary.wifiGuests = health.num_guest;
            break;
          case "lan":
            if (health.status === "ok") {
              summary.lanStatus = "enabled";
            }
            summary.lanUsers = health.num_user;
            summary.lanGuests = health.num_guest;
            break;
          case "vpn":
            if (health.status === "ok") {
              summary.vpnStatus = "enabled";
            }
            summary.vpnUsers = health.remote_user_num_active;
            break;
        }
      }
    }

    return summary;
  }

  public async testConnectionAsync(): Promise<void> {
    await this.authenticateAndConstructSessionInHeaderAsync();
  }

  private headers: Record<string, string> | undefined = undefined;
  private csrfToken: string | undefined;

  private async authenticateAndConstructSessionInHeaderAsync(): Promise<void> {
    if (!this.prefix) {
      logger.debug("prefix for authentication not set; initial connect to determine UDM variant");
      const url = this.url("/");
      logger.debug("url for initial connection: " + url.toString());

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
      logger.debug("final prefix: " + this.prefix);
    }

    if (!this.headers) {
      logger.debug("starting to authenticate");
      const endpoint = this.prefix === udmpPrefix ? "auth/login" : "login";
      logger.debug("endpoint: " + endpoint);

      const loginUrl = this.url(`/api/${endpoint}`);
      logger.debug("loginUrl: " + loginUrl.toString());

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
  }
}
