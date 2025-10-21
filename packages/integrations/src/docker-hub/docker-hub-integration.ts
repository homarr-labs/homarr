import type { fetch, RequestInit, Response } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { ResponseError } from "@homarr/common/server";
import { logger } from "@homarr/log";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ReleasesProviderIntegration } from "../interfaces/releases-providers/releases-providers-integration";
import { getLatestRelease } from "../interfaces/releases-providers/releases-providers-integration";
import type {
  DetailsProviderResponse,
  LatestReleaseResponse,
} from "../interfaces/releases-providers/releases-providers-types";
import { accessTokenResponseSchema, detailsResponseSchema, releasesResponseSchema } from "./docker-hub-schemas";

const localLogger = logger.child({ module: "DockerHubIntegration" });

export class DockerHubIntegration extends Integration implements ReleasesProviderIntegration {
  private readonly sessionStore: SessionStore<string>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  private async withHeadersAsync(callback: (headers: RequestInit["headers"]) => Promise<Response>): Promise<Response> {
    if (!this.hasSecretValue("username") || !this.hasSecretValue("personalAccessToken"))
      return await callback(undefined);

    const storedSession = await this.sessionStore.getAsync();

    if (storedSession) {
      localLogger.debug("Using stored session for request", { integrationId: this.integration.id });
      const response = await callback({
        Authorization: `Bearer ${storedSession}`,
      });
      if (response.status !== 401) {
        return response;
      }

      localLogger.debug("Session expired, getting new session", { integrationId: this.integration.id });
    }

    const accessToken = await this.getSessionAsync();
    await this.sessionStore.setAsync(accessToken);
    return await callback({
      Authorization: `Bearer ${accessToken}`,
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const hasAuth = this.hasSecretValue("username") && this.hasSecretValue("personalAccessToken");

    if (hasAuth) {
      localLogger.debug("Testing DockerHub connection with authentication", { integrationId: this.integration.id });
      await this.getSessionAsync(input.fetchAsync);
    } else {
      localLogger.debug("Testing DockerHub connection without authentication", { integrationId: this.integration.id });
      const response = await input.fetchAsync(this.url("/v2/repositories/library"));
      if (!response.ok) {
        return TestConnectionError.StatusResult(response);
      }
    }

    return {
      success: true,
    };
  }

  private parseIdentifier(identifier: string) {
    if (!identifier.includes("/")) {
      return { owner: "", name: identifier };
    }
    const [owner, name] = identifier.split("/");
    if (!owner || !name) {
      localLogger.warn(`Invalid identifier format. Expected 'owner/name' or 'name', for ${identifier} on DockerHub`, {
        identifier,
      });
      return null;
    }
    return { owner, name };
  }

  public async getLatestMatchingReleaseAsync(
    identifier: string,
    versionRegex?: string,
  ): Promise<LatestReleaseResponse> {
    const parsedIdentifier = this.parseIdentifier(identifier);
    if (!parsedIdentifier) return { error: { code: "invalidIdentifier" } };
    const { owner, name } = parsedIdentifier;

    const relativeUrl: `/${string}` = owner
      ? `/v2/namespaces/${encodeURIComponent(owner)}/repositories/${encodeURIComponent(name)}`
      : `/v2/repositories/library/${encodeURIComponent(name)}`;

    for (let page = 0; page <= 5; page++) {
      const response = await this.getLatestMatchingReleaseFromPageAsync(relativeUrl, page, versionRegex);
      if (!response) continue;
      if ("error" in response) return response;
      const details = await this.getDetailsAsync(relativeUrl);
      return { ...details, ...response };
    }

    return { error: { code: "noMatchingVersion" } };
  }

  private async getLatestMatchingReleaseFromPageAsync(
    relativeUrl: `/${string}`,
    page: number,
    versionRegex?: string,
  ): Promise<LatestReleaseResponse | null> {
    const releasesResponse = await this.withHeadersAsync(async (headers) => {
      return await fetchWithTrustedCertificatesAsync(this.url(`${relativeUrl}/tags?page_size=100&page=${page}`), {
        headers,
      });
    });
    if (!releasesResponse.ok) {
      return { error: { message: releasesResponse.statusText } };
    }

    const releasesResponseJson: unknown = await releasesResponse.json();
    const releasesResult = releasesResponseSchema.safeParse(releasesResponseJson);
    if (!releasesResult.success) {
      return {
        error: {
          message: releasesResponseJson ? JSON.stringify(releasesResponseJson, null, 2) : releasesResult.error.message,
        },
      };
    }

    return getLatestRelease(releasesResult.data.results, versionRegex);
  }

  private async getDetailsAsync(relativeUrl: `/${string}`): Promise<DetailsProviderResponse | undefined> {
    const response = await this.withHeadersAsync(async (headers) => {
      return await fetchWithTrustedCertificatesAsync(this.url(`${relativeUrl}/`), {
        headers,
      });
    });

    if (!response.ok) {
      localLogger.warn(`Failed to get details response for ${relativeUrl} with DockerHub integration`, {
        relativeUrl,
        error: response.statusText,
      });

      return undefined;
    }

    const responseJson = await response.json();
    const { data, success, error } = detailsResponseSchema.safeParse(responseJson);

    if (!success) {
      localLogger.warn(`Failed to parse details response for ${relativeUrl} with DockerHub integration`, {
        relativeUrl,
        error,
      });

      return undefined;
    }

    return {
      projectUrl: `https://hub.docker.com/r/${data.namespace === "library" ? "_" : data.namespace}/${data.name}`,
      projectDescription: data.description,
      createdAt: data.date_registered,
      starsCount: data.star_count,
    };
  }

  private async getSessionAsync(fetchAsync: typeof fetch = fetchWithTrustedCertificatesAsync): Promise<string> {
    const response = await fetchAsync(this.url("/v2/auth/token"), {
      method: "POST",
      body: JSON.stringify({
        identifier: this.getSecretValue("username"),
        secret: this.getSecretValue("personalAccessToken"),
      }),
    });

    if (!response.ok) throw new ResponseError(response);

    const data = await response.json();
    const result = await accessTokenResponseSchema.parseAsync(data);

    if (!result.access_token) {
      throw new ResponseError({ status: 401, url: response.url });
    }

    localLogger.info("Received session successfully", { integrationId: this.integration.id });

    return result.access_token;
  }
}
