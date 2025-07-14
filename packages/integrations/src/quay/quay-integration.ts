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
  ReleaseProviderResponse,
  ReleasesRepository,
  ReleasesResponse,
} from "../interfaces/releases-providers/releases-providers-types";
import { releasesResponseSchema } from "./quay-schemas";

const localLogger = logger.child({ module: "QuayIntegration" });

export class QuayIntegration extends Integration implements ReleasesProviderIntegration {
  private async withHeadersAsync(callback: (headers: RequestInit["headers"]) => Promise<Response>): Promise<Response> {
    if (!this.hasSecretValue("personalAccessToken")) return await callback({});

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

  public async getLatestMatchingReleaseAsync(repository: ReleasesRepository): Promise<ReleasesResponse> {
    const [owner, name] = repository.identifier.split("/");
    if (!owner || !name) {
      localLogger.warn(
        `Invalid identifier format. Expected 'owner/name', for ${repository.identifier} with LinuxServerIO integration`,
        {
          identifier: repository.identifier,
        },
      );
      return {
        id: repository.id,
        error: { code: "invalidIdentifier" },
      };
    }

    const releasesResponse = await fetchWithTrustedCertificatesAsync(
      this.url(`/api/v1/repository/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases`),
    );

    if (!releasesResponse.ok) {
      return {
        id: repository.id,
        error: { message: releasesResponse.statusText },
      };
    }

    const releasesResponseJson: unknown = await releasesResponse.json();
    const { data, success, error } = releasesResponseSchema.safeParse(releasesResponseJson);

    if (!success) {
      return {
        id: repository.id,
        error: {
          message: error.message,
        },
      };
    } else {
      const details = {
        projectDescription: data.description,
      };

      const releasesProviderResponse = Object.entries(data.tags).reduce<ReleaseProviderResponse[]>((acc, [_, tag]) => {
        if (!tag.name || !tag.last_modified) return acc;

        acc.push({
          latestRelease: tag.name,
          latestReleaseAt: new Date(tag.last_modified),
          releaseUrl: `https://quay.io/repository/${owner}/${name}/tag/${tag.name}`,
        });

        return acc;
      }, []);

      return getLatestRelease(releasesProviderResponse, repository, details);
    }
  }
}
