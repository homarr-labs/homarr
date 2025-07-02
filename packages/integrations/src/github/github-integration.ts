import { Octokit, RequestError } from "octokit";

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

export class GithubIntegration extends Integration implements ReleasesProviderIntegration {
  private static readonly userAgent = "Homarr-Lab/Homarr:GithubIntegration";

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const headers: RequestInit["headers"] = {
      "User-Agent": GithubIntegration.userAgent,
    };

    if (this.hasSecretValue("personalAccessToken"))
      headers.Authorization = `Bearer ${this.getSecretValue("personalAccessToken")}`;

    const response = await input.fetchAsync(this.url("/octocat"), {
      headers,
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  public async getReleaseAsync(repository: ReleasesRepository): Promise<ReleasesResponse> {
    const [owner, name] = repository.identifier.split("/");
    if (!owner || !name) {
      logger.warn(
        `Invalid identifier format. Expected 'owner/name', for ${repository.identifier} with Github integration`,
        {
          identifier: repository.identifier,
        },
      );
      return {
        id: repository.id,
        error: { code: "invalidIdentifier" },
      };
    }

    const api = this.getApi();

    const details = await this.getDetailsAsync(api, owner, name);

    try {
      const releasesResponse = await api.rest.repos.listReleases({
        owner,
        repo: name,
      });

      if (releasesResponse.data.length === 0) {
        logger.warn(`No releases found, for ${repository.identifier} with Github integration`, {
          identifier: repository.identifier,
        });
        return {
          id: repository.id,
          error: { code: "noReleasesFound" },
        };
      }

      const releasesProviderResponse = releasesResponse.data.reduce<ReleaseProviderResponse[]>((acc, release) => {
        if (!release.published_at) return acc;

        acc.push({
          latestRelease: release.tag_name,
          latestReleaseAt: new Date(release.published_at),
          releaseUrl: release.html_url,
          releaseDescription: release.body ?? undefined,
          isPreRelease: release.prerelease,
        });
        return acc;
      }, []);

      return getLatestRelease(releasesProviderResponse, repository, details);
    } catch (error) {
      const errorMessage = error instanceof RequestError ? error.message : String(error);

      logger.warn(`Failed to get releases for ${owner}\\${name} with Github integration`, {
        owner,
        name,
        error: errorMessage,
      });

      return {
        id: repository.id,
        error: { message: errorMessage },
      };
    }
  }

  protected async getDetailsAsync(
    api: Octokit,
    owner: string,
    name: string,
  ): Promise<DetailsProviderResponse | undefined> {
    try {
      const response = await api.rest.repos.get({
        owner,
        repo: name,
      });

      return {
        projectUrl: response.data.html_url,
        projectDescription: response.data.description ?? undefined,
        isFork: response.data.fork,
        isArchived: response.data.archived,
        createdAt: new Date(response.data.created_at),
        starsCount: response.data.stargazers_count,
        openIssues: response.data.open_issues_count,
        forksCount: response.data.forks_count,
      };
    } catch (error) {
      logger.warn(`Failed to get details for ${owner}\\${name} with Github integration`, {
        owner,
        name,
        error: error instanceof RequestError ? error.message : String(error),
      });
      return undefined;
    }
  }

  private getApi() {
    return new Octokit({
      baseUrl: this.url("/").origin,
      userAgent: GithubIntegration.userAgent,
      throttle: { enabled: false }, // Disable throttling for this integration, Octokit will retry by default after a set time, thus delaying the repsonse to the user in case of errors. Errors will be shown to the user, no need to retry the request.
      ...(this.hasSecretValue("personalAccessToken") ? { auth: this.getSecretValue("personalAccessToken") } : {}),
    });
  }
}
