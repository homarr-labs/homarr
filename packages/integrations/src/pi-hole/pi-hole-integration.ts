import { z } from "zod";

import { extractErrorMessage } from "@homarr/common";
import { TranslationFunction } from "@homarr/translation";
import { getI18n } from "@homarr/translation/server";

import type { TestConnectionResult } from "../base/integration";
import { Integration } from "../base/integration";
import type { DnsHoleSummaryIntegration } from "../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { DnsHoleSummary } from "../interfaces/dns-hole-summary/dns-hole-summary-types";
import { summaryResponseSchema } from "./pi-hole-types";

export class PiHoleIntegration extends Integration implements DnsHoleSummaryIntegration {
  public async getSummaryAsync(): Promise<DnsHoleSummary> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetch(`${this.integration.url}/admin/api.php?summaryRaw&auth=${apiKey}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch summary for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
      );
    }

    const result = summaryResponseSchema.safeParse(await response.json());

    if (!result.success) {
      throw new Error(
        `Failed to parse summary for ${this.integration.name} (${this.integration.id}), most likely your api key is wrong: ${result.error.message}`,
      );
    }

    return {
      adsBlockedToday: result.data.ads_blocked_today,
      adsBlockedTodayPercentage: result.data.ads_percentage_today,
      domainsBeingBlocked: result.data.domains_being_blocked,
      dnsQueriesToday: result.data.dns_queries_today,
    };
  }

  public async testConnectionAsync(): Promise<TestConnectionResult> {
    const apiKey = super.getSecretValue("apiKey");

    return await testConnectionHelperAsync({
      queryFunctionAsync: async () => {
        return await fetch(`${this.integration.url}/admin/api.php?status&auth=${apiKey}`);
      },
    });

    const responseOrError = await fetch(`${this.integration.url}/admin/api.php?status&auth=${apiKey}`).catch(
      extractErrorMessage,
    );

    if (typeof responseOrError === "string") {
      return {
        ok: false,
        error: responseOrError,
      };
    }

    if (!responseOrError.ok) {
      return {
        ok: false,
        error: "Status code not ok",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json: object | null = await responseOrError.json().catch(() => null);
    if (json === null)
      return {
        ok: false,
        error: "Unable to parse json",
      };

    if (!("status" in json)) {
      return {
        ok: false,
        error: "Probably invalid api key",
      };
    }

    return {
      ok: true,
    };
  }
}

const causeSchema = z.object({
  code: z.string(),
});

const testConnectionHelperAsync = async ({
  queryFunctionAsync,
}: {
  queryFunctionAsync: () => Promise<Response>;
}): Promise<TestConnectionResult> => {
  const t = await getI18n();

  const responseOrError = await queryFunctionAsync().catch((error) => {
    if (error instanceof Error) {
      const cause = causeSchema.safeParse(error.cause);
      if (!cause.success) {
        return {
          title: t("integration.testConnection.notification.commonError.title"),
          message: extractErrorMessage(error),
        };
      }

      if (cause.data.code === "ENOTFOUND") {
        return {
          title: "ENOTFOUND",
          message: "Domain could not be found",
        };
      }

      if (cause.data.code === "ECONNREFUSED") {
        return {
          title: "Connection refused",
          message: "THe server refused the connection",
        };
      }

      if (cause.data.code === "ECONNABORTED") {
        return {
          title: "Connection refused",
          message: "The connection was aborted",
        };
      }
    }

    return {
      title: t("integration.testConnection.notification.commonError.title"),
      message: extractErrorMessage(error),
    };
  });

  if (!(responseOrError instanceof Response))
    return {
      success: false,
      error: responseOrError,
    };

  if (responseOrError.status >= 400) {
    // TODO: define a better error message and use logger
    console.error(await responseOrError.text());
    return {
      success: false,
      error: getErrorByStatusCode(responseOrError.status, t),
    };
  }

  return {
    success: true,
  };
};

const getErrorByStatusCode = (statusCode: number, t: TranslationFunction) => {
  switch (statusCode) {
    case 400:
      return {
        title: "Bad Request",
        message: "The request was malformed",
      };
    case 401:
      return {
        title: "Unauthorized",
        message: "Probably wrong credentials",
      };
    case 403:
      return {
        title: "Forbidden",
        message: "Probably missing permissions",
      };
    case 404:
      return {
        title: "Not Found",
        message: "Probably wrong url or path",
      };
    case 500:
      return {
        title: "Internal Server Error",
        message: "The server encountered an error",
      };
    case 503:
      return {
        title: "Service Unavailable",
        message: "The server is currently unavailable",
      };
    default:
      return {
        title: t("integration.testConnection.notification.commonError.title"),
        message: t("integration.testConnection.notification.commonError.message"),
      };
  }
};
