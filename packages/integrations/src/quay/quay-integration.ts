import type { RequestInit, Response } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ReleasesProviderIntegration } from "../interfaces/releases-providers/releases-providers-integration";
import { getLatestRelease } from "../interfaces/releases-providers/releases-providers-integration";
import type {
  DetailedRelease,
  ErrorResponse,
  ParsedIdentifier,
  ReleaseProviderResponse,
} from "../interfaces/releases-providers/releases-providers-types";
import { releasesResponseSchema } from "./quay-schemas";

const localLogger = logger.child({ module: "QuayIntegration" });

export class QuayIntegration extends Integration implements ReleasesProviderIntegration {
  private async withHeadersAsync(callback: (headers: RequestInit["headers"]) => Promise<Response>): Promise<Response> {
    if (!this.hasSecretValue("personalAccessToken")) return await callback(undefined);

    return await callback({
      Authorization: `token ${this.getSecretValue("personalAccessToken")}`,
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await this.withHeadersAsync(async (headers) => {
      return await input.fetchAsync(this.url("/api/v1/discovery"), {
        headers,
      });
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  public parseIdentifier(identifier: string): ParsedIdentifier | null {
    const [owner, name] = identifier.split("/");
    if (!owner || !name) {
      localLogger.warn(`Invalid identifier format. Expected 'owner/name', for ${identifier} with Quay integration`, {
        identifier,
      });
      return null;
    }
    return { owner, name };
  }

  public async getLatestMatchingReleaseAsync(
    identifier: ParsedIdentifier,
    versionRegex?: string,
  ): Promise<DetailedRelease | ErrorResponse | null> {
    const { owner, name } = identifier;

    const releasesResponse = await this.withHeadersAsync(async (headers) => {
      return await fetchWithTrustedCertificatesAsync(
        this.url(
          `/api/v1/repository/${encodeURIComponent(owner)}/${encodeURIComponent(name)}?includeTags=true&includeStats=true`,
        ),
        {
          headers,
        },
      );
    });
    if (!releasesResponse.ok) {
      return { message: releasesResponse.statusText };
    }

    const releasesResponseJson: unknown = await releasesResponse.json();
    const { data, success, error } = releasesResponseSchema.safeParse(releasesResponseJson);
    if (!success) {
      return { message: error.message };
    }

    const releasesProviderResponse = Object.entries(data.tags).reduce<ReleaseProviderResponse[]>((acc, [_, tag]) => {
      if (!tag.name || !tag.last_modified) return acc;

      acc.push({
        latestRelease: tag.name,
        latestReleaseAt: new Date(tag.last_modified),
        releaseUrl: `https://quay.io/repository/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/tag/${encodeURIComponent(tag.name)}`,
      });

      return acc;
    }, []);

    const latestRelease = getLatestRelease(releasesProviderResponse, versionRegex);
    if (!latestRelease) return null;

    return {
      projectDescription: data.description,
      ...latestRelease,
    };
  }
}
