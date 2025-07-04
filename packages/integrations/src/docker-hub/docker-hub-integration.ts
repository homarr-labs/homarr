import type { RequestInit } from "undici";
import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ReleasesProviderIntegration } from "../interfaces/releases-providers/releases-providers-integration";
import { getLatestRelease } from "../interfaces/releases-providers/releases-providers-integration";
import type {
  DetailsProviderResponse,
  ReleasesRepository,
  ReleasesResponse,
} from "../interfaces/releases-providers/releases-providers-types";

export class DockerHubIntegration extends Integration implements ReleasesProviderIntegration {
  protected async buildHeadersAsync(): Promise<RequestInit["headers"]> {
    if (!this.hasSecretValue("username") || !this.hasSecretValue("personalAccessToken")) return {};

    // Request auth token
    const accessTokenResponse = await fetchWithTrustedCertificatesAsync(this.url("/v2/auth/token"), {
      method: "POST",
      body: JSON.stringify({
        identifier: this.getSecretValue("username"),
        secret: this.getSecretValue("personalAccessToken"),
      }),
    });

    if (!accessTokenResponse.ok) {
      logger.warn("Failed to fetch access token for Docker Hub", {
        status: accessTokenResponse.status,
        statusText: accessTokenResponse.statusText,
      });
      return {};
    }

    // Parse response
    const accessTokenResponseJson: unknown = await accessTokenResponse.json();
    const accessTokenResult = z
      .object({
        access_token: z.string(),
      })
      .safeParse(accessTokenResponseJson);

    if (!accessTokenResult.success || !accessTokenResult.data.access_token) {
      logger.warn("Failed to parse access token response for Docker Hub", {
        error: accessTokenResult.error,
        response: accessTokenResponseJson,
      });
      return {};
    }

    return {
      Authorization: `Bearer ${accessTokenResult.data.access_token}`,
    };
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const hasAuth = this.hasSecretValue("username") && this.hasSecretValue("personalAccessToken");
    const response = hasAuth
      ? await input.fetchAsync(this.url("/v2/auth/token"), {
          method: "POST",
          body: JSON.stringify({
            identifier: this.getSecretValue("username"),
            secret: this.getSecretValue("personalAccessToken"),
          }),
        })
      : await input.fetchAsync(this.url("/v2/repositories/library"));

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  public async getLatestMatchingReleaseAsync(repository: ReleasesRepository): Promise<ReleasesResponse> {
    const relativeUrl = this.getRelativeUrl(repository.identifier);
    if (relativeUrl === "/") {
      logger.warn(
        `Invalid identifier format. Expected 'owner/name' or 'name', for ${repository.identifier} on DockerHub`,
        {
          identifier: repository.identifier,
        },
      );
      return {
        id: repository.id,
        error: { code: "invalidIdentifier" },
      };
    }

    const headers = await this.buildHeadersAsync();
    const details = await this.getDetailsAsync(relativeUrl, headers);

    const releasesResponse = await fetchWithTrustedCertificatesAsync(this.url(`${relativeUrl}/tags?page_size=100`), {
      headers,
    });

    if (!releasesResponse.ok) {
      return {
        id: repository.id,
        error: { message: releasesResponse.statusText },
      };
    }

    const releasesResponseJson: unknown = await releasesResponse.json();
    const releasesResult = z
      .object({
        results: z.array(
          z
            .object({ name: z.string(), last_updated: z.string().transform((value) => new Date(value)) })
            .transform((tag) => ({
              latestRelease: tag.name,
              latestReleaseAt: tag.last_updated,
            })),
        ),
      })
      .safeParse(releasesResponseJson);

    if (!releasesResult.success) {
      return {
        id: repository.id,
        error: {
          message: releasesResponseJson ? JSON.stringify(releasesResponseJson, null, 2) : releasesResult.error.message,
        },
      };
    } else {
      return getLatestRelease(releasesResult.data.results, repository, details);
    }
  }

  protected async getDetailsAsync(
    relativeUrl: `/${string}`,
    headers: RequestInit["headers"],
  ): Promise<DetailsProviderResponse | undefined> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(relativeUrl), {
      headers,
    });

    if (!response.ok) {
      logger.warn(`Failed to get details response for ${relativeUrl} with DockerHub integration`, {
        relativeUrl,
        error: response.statusText,
      });

      return undefined;
    }

    const responseJson = await response.json();
    const parsedDetails = z
      .object({
        name: z.string(),
        namespace: z.string(),
        description: z.string(),
        star_count: z.number(),
        date_registered: z.string().transform((value) => new Date(value)),
      })
      .transform((resp) => ({
        projectUrl: `https://hub.docker.com/r/${resp.namespace === "library" ? "_" : resp.namespace}/${resp.name}`,
        projectDescription: resp.description,
        createdAt: resp.date_registered,
        starsCount: resp.star_count,
      }))
      .safeParse(responseJson);

    if (!parsedDetails.success) {
      logger.warn(`Failed to parse details response for ${relativeUrl} with DockerHub integration`, {
        relativeUrl,
        error: parsedDetails.error,
      });

      return undefined;
    }

    return parsedDetails.data;
  }

  protected getRelativeUrl(identifier: string): `/${string}` {
    if (identifier.indexOf("/") > 0) {
      const [owner, name] = identifier.split("/");
      if (!owner || !name) {
        return "/";
      }
      return `/v2/namespaces/${encodeURIComponent(owner)}/repositories/${encodeURIComponent(name)}`;
    } else {
      return `/v2/repositories/library/${encodeURIComponent(identifier)}`;
    }
  }
}
