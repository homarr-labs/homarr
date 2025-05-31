import type { RequestInit } from "undici";
import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationAxiosHttpErrorHandler } from "../base/errors/http";
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

// TODO: Check integrations errors
@HandleIntegrationErrors([integrationAxiosHttpErrorHandler])
export class GithubIntegration extends Integration implements ReleasesProviderIntegration {
  protected buildHeaders(accept = "application/vnd.github+json"): RequestInit {
    return {
      headers: {
        Authorization: `Bearer ${this.getSecretValue("tokenId")}`,
        "User-Agent": "Homarr-Lab/Homarr:GithubIntegration",
        Accept: accept,
      },
    };
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/octocat"), this.buildHeaders());

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  public async getReleasesAsync(repositories: ReleasesRepository[]): Promise<ReleasesResponse[]> {
    return await Promise.all(
      repositories.map(async (repository) => {
        const [owner, name] = repository.identifier.split("/");
        if (!owner || !name) {
          logger.warn(`Invalid identifier format. Expected 'owner/name', for ${repository.identifier} on Github`, {
            identifier: repository.identifier,
          });
          return {
            identifier: repository.identifier,
            providerKey: repository.providerKey,
            error: { code: "invalidIdentifier" },
          };
        }

        const details = await this.getDetailsAsync(owner, name);

        const releasesResponse = await fetchWithTrustedCertificatesAsync(
          this.url(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases`),
          this.buildHeaders(),
        );

        if (!releasesResponse.ok) {
          return {
            identifier: repository.identifier,
            providerKey: repository.providerKey,
            error: { message: releasesResponse.statusText },
          };
        }

        const releasesResponseJson: unknown = await releasesResponse.json();
        const releasesResult = z
          .array(
            z
              .object({
                tag_name: z.string(),
                published_at: z.string().transform((value) => new Date(value)),
                html_url: z.string(),
                body: z.string().nullable(),
                prerelease: z.boolean(),
              })
              .transform((tag) => ({
                latestRelease: tag.tag_name,
                latestReleaseAt: tag.published_at,
                releaseUrl: tag.html_url,
                releaseDescription: tag.body ?? undefined,
                isPreRelease: tag.prerelease,
              })),
          )
          .safeParse(releasesResponseJson);

        if (!releasesResult.success) {
          return {
            identifier: repository.identifier,
            providerKey: repository.providerKey,
            error: {
              message: releasesResponseJson
                ? JSON.stringify(releasesResponseJson, null, 2)
                : releasesResult.error.message,
            },
          };
        } else {
          return getLatestRelease(releasesResult.data, repository, details);
        }
      }),
    );
  }

  protected async getDetailsAsync(owner: string, name: string): Promise<DetailsProviderResponse | undefined> {
    const response = await fetchWithTrustedCertificatesAsync(
      this.url(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`),
      this.buildHeaders(),
    );

    if (!response.ok) {
      logger.warn(`Failed to get details response for ${owner}\\${name} on Github`, {
        owner,
        name,
        error: response.statusText,
      });

      return undefined;
    }

    const responseJson = await response.json();
    const parsedDetails = z
      .object({
        html_url: z.string(),
        description: z.string().nullable(),
        fork: z.boolean(),
        archived: z.boolean(),
        created_at: z.string().transform((value) => new Date(value)),
        stargazers_count: z.number(),
        open_issues_count: z.number(),
        forks_count: z.number(),
      })
      .transform((resp) => ({
        projectUrl: resp.html_url,
        projectDescription: resp.description ?? undefined,
        isFork: resp.fork,
        isArchived: resp.archived,
        createdAt: resp.created_at,
        starsCount: resp.stargazers_count,
        openIssues: resp.open_issues_count,
        forksCount: resp.forks_count,
      }))
      .safeParse(responseJson);

    if (!parsedDetails.success) {
      logger.warn(`Failed to parse details response for ${owner}\\${name} on Github`, {
        owner,
        name,
        error: parsedDetails.error,
      });

      return undefined;
    }

    return parsedDetails.data;
  }
}
