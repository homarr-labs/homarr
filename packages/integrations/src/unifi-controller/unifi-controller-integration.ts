import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { NetworkControllerSummaryIntegration } from "../interfaces/network-controller-summary/network-controller-summary-integration";
import type { NetworkControllerSummary } from "../interfaces/network-controller-summary/network-controller-summary-types";
import { unifiSummaryResponseSchema } from "./unifi-controller-types";
import { logger } from "@homarr/log";

const udmpPrefix = "proxy/network";



export class UnifiControllerIntegration extends Integration implements NetworkControllerSummaryIntegration {

  private prefix: string | null | undefined;


  static extractLoginTokenFromCookies(headers: Headers): string {
    const cookies = headers.get("set-cookie") ?? "";
    const loginToken = cookies
      .split(";")
      .find((cookie) => cookie.includes("TOKEN"));
  
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

    logger.debug("starting request");
    //const endpoint = this.prefix === udmpPrefix ? "auth/login" : "login";
    logger.debug("prefix: "+this.prefix); 

    const requestUrl = this.url(`/${this.prefix}/api/stat/sites`);
    logger.debug("requestUrl: "+requestUrl.toString()); 

    const requestHeaders: Record<string, string> = { 
      "Content-Type": "application/json",
      ...this.headers,
    };
    if (this.csrfToken) {
      requestHeaders["X-CSRF-TOKEN"] = this.csrfToken;
    } 
    logger.debug("requestHeaders: "+JSON.stringify(requestHeaders)); 
    
    // do stats call
    const statsResponse = await fetchWithTrustedCertificatesAsync(requestUrl,  {
      method: 'GET', 
      headers: {
        ...requestHeaders,
      },
      })
      .catch((err: TypeError) => {
        const detailMessage = String(err.cause);
        throw new IntegrationTestConnectionError("invalidUrl", detailMessage);
      });
      
    
    
    logger.debug("back from stats call");
    if (!statsResponse.ok) {
      logger.debug("status after stats call: "+statsResponse.status);
      logger.debug("status text after stats call: "+statsResponse.statusText);
      logger.debug("url from stats call: "+statsResponse.url);

      throwErrorByStatusCode(statsResponse.status);
    }

    const result = unifiSummaryResponseSchema.safeParse(await statsResponse.json());
    logger.debug("look what we got: "+JSON.stringify(result));

    const summary: NetworkControllerSummary = {
      wanStatus: "disabled",

      wwwStatus:  "disabled",
      wwwLatency: -1,
      wwwPing:    -1,
      wwwUptime:  -1,
      
      wifiStatus: "disabled",
      wifiUsers:  -1,
      wifiGuests: -1,

      lanStatus: "disabled",
      lanUsers:  -1,
      lanGuests: -1,

      vpnStatus: "disabled",
      vpnUsers: -1,
    };

    if (result.success) {
      for (const site of result.data.data) {
        if (site.name !== "default") {
          break;
        }

        for (const health of site.health) {
          switch(health.subsystem) {
            case "wan":
              if (health.status === "ok") {summary.wanStatus = "enabled"}
              break;
            
            case "www":
              if (health.status === "ok") {summary.wwwStatus = "enabled"}
              summary.wwwLatency = health.latency;
              summary.wwwPing    = health.speedtest_ping;
              summary.wwwUptime  = health.uptime;
              break;

            case "wlan":
              if (health.status === "ok") {summary.wifiStatus = "enabled"}
              summary.wifiUsers  = health.num_user;
              summary.wifiGuests = health.num_guest;
              break;

            case "lan":
              if (health.status === "ok") {summary.lanStatus = "enabled"}
              summary.lanUsers  = health.num_user;
              summary.lanGuests = health.num_guest;
              break;

            case "vpn":
              if (health.status === "ok") {summary.vpnStatus = "enabled"}
              summary.vpnUsers  = health.remote_user_num_active;
              break;

            default:
              break;
          }
        }
      }

    }

    return summary;
  }


  public async testConnectionAsync(): Promise<void> {

    await this.authenticateAndConstructSessionInHeaderAsync();

  }

  private headers: Record<string, string> | undefined = undefined;
  private csrfToken: string | null | undefined;

  
  private async authenticateAndConstructSessionInHeaderAsync(): Promise<void> {
    logger.debug("prefix:"+this.prefix); 

    //let csrfToken: string | null | undefined;
    if (!this.prefix) {
      logger.debug("prefix not set; initial connect to determine UDM variant");
      // check for UDM Pro and remember
      const url = this.url("/");
      logger.debug("url:"+url.toString());

      const { status, ok, headers} = await fetchWithTrustedCertificatesAsync(url,  { method: 'HEAD', })
      .then(res => res)
      .catch((err: TypeError) => {
        const detailMessage = String(err.cause);
        throw new IntegrationTestConnectionError("invalidUrl", detailMessage);
      });

      logger.debug("status after initial connection: "+status); 

      if (!ok) {
        //Todo
        throw new IntegrationTestConnectionError("invalidUrl", "status code: "+status);
      }

      let prefix = "";
      if (headers.get("x-csrf-token") !== null) {
        // Unifi OS < 3.2.5 passes & requires csrf-token
        prefix = udmpPrefix;
        this.csrfToken = headers.get("x-csrf-token");

      } else if (headers.get("access-control-expose-headers") !== null) {
        // Unifi OS ≥ 3.2.5 doesnt pass csrf token but still uses different endpoint
        prefix = udmpPrefix;
      }
      this.prefix = prefix;
      logger.debug("final prefix: "+this.prefix); 
    }

    logger.debug("trying log in");
    if (!this.headers) {
      logger.debug("starting to authenticate");
      const endpoint = this.prefix === udmpPrefix ? "auth/login" : "login";
      logger.debug("endpoint: "+endpoint); 

      const loginUrl = this.url(`/api/${endpoint}`);
      logger.debug("loginUrl: "+loginUrl.toString()); 
      
      const loginBody = { 
        username: this.getSecretValue("username"),
        password: this.getSecretValue("password"), 
        remember: true,
      }; 

      const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (this.csrfToken) {
        requestHeaders["X-CSRF-TOKEN"] = this.csrfToken;
      } 
      logger.debug("requestHeaders: "+JSON.stringify(requestHeaders)); 
      
      // do login call
      const loginResponse = await fetchWithTrustedCertificatesAsync(loginUrl,  {
        method: 'POST', 
        headers: {
          ...requestHeaders,
        },
        body: JSON.stringify(loginBody),
        })
        .catch((err: TypeError) => {
          const detailMessage = String(err.cause);
          throw new IntegrationTestConnectionError("invalidUrl", detailMessage);
        });
        
      
      
      logger.debug("back from login call");
      if (!loginResponse.ok) {
        logger.debug("status after login call: "+loginResponse.status);
        logger.debug("status text after login call: "+loginResponse.statusText);
        logger.debug("url from login call: "+loginResponse.url);

        throwErrorByStatusCode(loginResponse.status);
      }
      
      const responseHeaders = loginResponse.headers;
      const newHeaders: Record<string, string> = {};
      const loginToken = UnifiControllerIntegration.extractLoginTokenFromCookies(responseHeaders);
      logger.debug("response headers checked after login");
      logger.debug("setting auth token");
      newHeaders.Cookie = `${loginToken};`;
      this.headers = newHeaders;
    }
  }

}


const throwErrorByStatusCode = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      throw new IntegrationTestConnectionError("badRequest");
    case 401:
      throw new IntegrationTestConnectionError("unauthorized");
    case 403:
      throw new IntegrationTestConnectionError("forbidden");
    case 404:
      throw new IntegrationTestConnectionError("notFound");
    case 429:
      throw new IntegrationTestConnectionError("tooManyRequests");
    case 500:
      throw new IntegrationTestConnectionError("internalServerError");
    case 503:
      throw new IntegrationTestConnectionError("serviceUnavailable");
    default:
      throw new IntegrationTestConnectionError("commonError");
  }
};

