import type { Gitlab as CoreGitlab } from "@gitbeaker/core";
import { Gitlab } from "@gitbeaker/rest";

import { logger } from "@homarr/log";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ReleasesProviderIntegration } from "../interfaces/releases-providers/releases-providers-integration";
import { getLatestRelease } from "../interfaces/releases-providers/releases-providers-integration";
import type {
  DetailsProviderResponse,
  ReleaseProviderResponse,
  ReleasesRepository,
  ReleasesResponse,
} from "../interfaces/releases-providers/releases-providers-types";

export class GitlabIntegration extends Integration implements ReleasesProviderIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/v4/projects"), {
      headers: {
        ...(this.hasSecretValue("personalAccessToken")
          ? { Authorization: `Bearer ${this.getSecretValue("personalAccessToken")}` }
          : {}),
      },
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  public async getReleaseAsync(repository: ReleasesRepository): Promise<ReleasesResponse> {
    const api = this.getApi();

    const details = await this.getDetailsAsync(api, repository.identifier);

    try {
      const releasesResponse = await api.ProjectReleases.all(repository.identifier, {
        perPage: 100,
      });

      if (releasesResponse instanceof Error) {
        logger.warn(`Failed to get releases for ${repository.identifier} with Gitlab integration`, {
          identifier: repository.identifier,
          error: releasesResponse.message,
        });
        return {
          id: repository.id,
          error: { code: "noReleasesFound" },
        };
      }

      const releasesProviderResponse = releasesResponse.reduce<ReleaseProviderResponse[]>((acc, release) => {
        if (!release.released_at) return acc;

        acc.push({
          latestRelease: release.name ?? release.tag_name,
          latestReleaseAt: new Date(release.released_at),
          releaseUrl: release._links.self,
          releaseDescription: release.description ?? undefined,
          //isPreRelease: release.upcoming_release ?? false, // upcoming_release - is not available with @gitbeaker/rest SDK. Raised issue on GitHub https://github.com/jdalrymple/gitbeaker/issues/3730
        });
        return acc;
      }, []);

      return getLatestRelease(releasesProviderResponse, repository, details);
    } catch (error) {
      logger.warn(`Failed to get releases for ${repository.identifier} with Gitlab integration`, {
        identifier: repository.identifier,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        id: repository.id,
        error: { code: "noReleasesFound" },
      };
    }
  }

  protected async getDetailsAsync(api: CoreGitlab, identifier: string): Promise<DetailsProviderResponse | undefined> {
    try {
      const response = await api.Projects.show(identifier);

      if (response instanceof Error) {
        logger.warn(`Failed to get details for ${identifier} with Gitlab integration`, {
          identifier,
          error: response.message,
        });

        return undefined;
      }

      if (!response.web_url || typeof response.web_url !== "string") {
        logger.warn(`No web URL found for ${identifier} with Gitlab integration`, {
          identifier,
        });
        return undefined;
      }

      return {
        projectUrl: response.web_url,
        projectDescription: response.description,
        isFork: response.forked_from_project !== null,
        isArchived: response.archived,
        createdAt: typeof response.created_at === "string" ? new Date(response.created_at) : undefined,
        starsCount: typeof response.star_count === "number" ? response.star_count : undefined,
        openIssues: typeof response.open_issues_count === "number" ? response.open_issues_count : undefined,
        forksCount: typeof response.forks_count === "number" ? response.forks_count : undefined,
      };
    } catch (error) {
      logger.warn(`Failed to get details for ${identifier} with Gitlab integration`, {
        identifier,
        error: error instanceof Error ? error.message : String(error),
      });

      return undefined;
    }
  }

  private getApi() {
    return new Gitlab({
      host: this.url("/").toString(),
      ...(this.hasSecretValue("personalAccessToken") ? { token: this.getSecretValue("personalAccessToken") } : {}),
    });
  }
}
