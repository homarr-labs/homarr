import { escapeForRegEx } from "@tiptap/react";
import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationAxiosHttpErrorHandler } from "../base/errors/http";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { DetailsResponse, ProviderIntegration } from "../interfaces/providers/providers-integration";
import type { ReleaseResponse, Repository } from "../interfaces/providers/providers-types";

//  getDetailsUrl(identifier) {
//       const [owner, name] = identifier.split("/");
//       if (!owner || !name) {
//         return "";
//       }
//       return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
//     },
//     parseDetailsResponse(response) {
//       return z
//         .object({
//           html_url: z.string(),
//           description: z.string().nullable(),
//           fork: z.boolean(),
//           archived: z.boolean(),
//           created_at: z.string().transform((value) => new Date(value)),
//           stargazers_count: z.number(),
//           open_issues_count: z.number(),
//           forks_count: z.number(),
//         })
//         .transform((resp) => ({
//           projectUrl: resp.html_url,
//           projectDescription: resp.description ?? undefined,
//           isFork: resp.fork,
//           isArchived: resp.archived,
//           createdAt: resp.created_at,
//           starsCount: resp.stargazers_count,
//           openIssues: resp.open_issues_count,
//           forksCount: resp.forks_count,
//         }))
//         .safeParse(response);
//     },
//     getReleasesUrl(identifier) {
//       return `${this.getDetailsUrl(identifier)}/releases`;
//     },
//     parseReleasesResponse(response) {
//       return z
//         .array(
//           z
//             .object({
//               tag_name: z.string(),
//               published_at: z.string().transform((value) => new Date(value)),
//               html_url: z.string(),
//               body: z.string().nullable(),
//               prerelease: z.boolean(),
//             })
//             .transform((tag) => ({
//               identifier: "",
//               latestRelease: tag.tag_name,
//               latestReleaseAt: tag.published_at,
//               releaseUrl: tag.html_url,
//               releaseDescription: tag.body ?? undefined,
//               isPreRelease: tag.prerelease,
//             })),
//         )
//         .safeParse(response);
//     },

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

type ReleasesError = z.infer<typeof errorSchema>;

const _reponseSchema = z.object({
  identifier: z.string(),
  providerKey: z.string(),
  latestRelease: z.string().optional(),
  latestReleaseAt: z.date().optional(),
  releaseUrl: z.string().optional(),
  releaseDescription: z.string().optional(),
  isPreRelease: z.boolean().optional(),
  projectUrl: z.string().optional(),
  projectDescription: z.string().optional(),
  isFork: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  createdAt: z.date().optional(),
  starsCount: z.number().optional(),
  openIssues: z.number().optional(),
  forksCount: z.number().optional(),
  error: errorSchema.optional(),
});

//TODO: move this elsewhere
const _releaseVersionFilterSchema = z.object({
  prefix: z.string().optional(),
  precision: z.number(),
  suffix: z.string().optional(),
});

const formatVersionFilterRegex = (versionFilter: z.infer<typeof _releaseVersionFilterSchema> | undefined) => {
  if (!versionFilter) return undefined;

  const escapedPrefix = versionFilter.prefix ? escapeForRegEx(versionFilter.prefix) : "";
  const precision = "[0-9]+\\.".repeat(versionFilter.precision).slice(0, -2);
  const escapedSuffix = versionFilter.suffix ? escapeForRegEx(versionFilter.suffix) : "";

  return `^${escapedPrefix}${precision}${escapedSuffix}$`;
};

// TODO: Check integrations errors
@HandleIntegrationErrors([integrationAxiosHttpErrorHandler])
export class GithubIntegration extends Integration implements ProviderIntegration {
  protected buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("tokenId")}`,
      // TODO: add User-Agent header as per GitHub API requirements
      "User-Agent": "HomarrIntegration/1.0",
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

  public async getReleasesAsync(repositories: Repository[]): Promise<ReleaseResponse[]> {
    const results = await Promise.all(
      repositories.map(async (repository) => {
        const [owner, name] = repository.identifier.split("/");
        if (!owner || !name) {
          logger.warn(`Invalid identifier format. Expected 'owner/name', for ${repository.identifier} on Github`, {
            identifier: repository.identifier,
          });
          return undefined;
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
          const releases = releasesResult.data.filter((result) => {
            if (result.latestRelease) {
              const versionRegex = formatVersionFilterRegex(repository.versionFilter);
              return versionRegex ? new RegExp(versionRegex).test(result.latestRelease) : true;
            }

            return true;
          });

          const latest =
            releases.length === 0
              ? {
                  identifier: repository.identifier,
                  providerKey: repository.providerKey,
                  error: { code: "noMatchingVersion" },
                }
              : releases.reduce(
                  (latest, result) => {
                    return {
                      ...details,
                      ...(result.latestReleaseAt > latest.latestReleaseAt ? result : latest),
                      identifier: repository.identifier,
                      providerKey: repository.providerKey,
                    };
                  },
                  {
                    identifier: "",
                    providerKey: "",
                    latestRelease: "",
                    latestReleaseAt: new Date(0),
                  },
                );

          return latest;
        }
      }),
    );

    return results.filter((result) => result !== undefined);
  }

  private async getDetailsAsync(owner: string, name: string): Promise<DetailsResponse | undefined> {
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
