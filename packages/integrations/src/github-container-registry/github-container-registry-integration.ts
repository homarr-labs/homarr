import { Octokit, RequestError } from "octokit";

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
  ReleaseProviderResponse,
  ReleasesRepository,
  ReleasesResponse,
} from "../interfaces/releases-providers/releases-providers-types";

const localLogger = logger.child({ module: "GitHubContainerRegistryIntegration" });

export class GitHubContainerRegistryIntegration extends Integration implements ReleasesProviderIntegration {
  private static readonly userAgent = "Homarr-Lab/Homarr:GitHubContainerRegistryIntegration";

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const headers: RequestInit["headers"] = {
      "User-Agent": GitHubContainerRegistryIntegration.userAgent,
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

  public async getLatestMatchingReleaseAsync(repository: ReleasesRepository): Promise<ReleasesResponse> {
    const [owner, name] = repository.identifier.split("/");
    if (!owner || !name) {
      localLogger.warn(
        `Invalid identifier format. Expected 'owner/name', for ${repository.identifier} with GitHub Container Registry integration`,
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
      const releasesResponse = await api.rest.packages.getAllPackageVersionsForPackageOwnedByUser({
        username: owner,
        package_type: "container",
        package_name: name,
        per_page: 100,
      });

      const releasesProviderResponse = releasesResponse.data.reduce<ReleaseProviderResponse[]>((acc, release) => {
        if (!release.metadata?.container?.tags || !(release.metadata.container.tags.length > 0)) return acc;

        release.metadata.container.tags.forEach((tag) => {
          acc.push({
            latestRelease: tag,
            latestReleaseAt: new Date(release.updated_at),
            releaseUrl: release.html_url,
            releaseDescription: release.description ?? undefined,
          });
        });
        return acc;
      }, []);

      return getLatestRelease(releasesProviderResponse, repository, details);
    } catch (error) {
      const errorMessage = error instanceof RequestError ? error.message : String(error);

      localLogger.warn(`Failed to get releases for ${owner}\\${name} with GitHub Container Registry integration`, {
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
      const response = await api.rest.packages.getPackageForUser({
        username: owner,
        package_type: "container",
        package_name: name,
      });

      return {
        projectUrl: response.data.repository?.html_url ?? response.data.html_url,
        projectDescription: response.data.repository?.description ?? undefined,
        isFork: response.data.repository?.fork,
        isArchived: response.data.repository?.archived,
        createdAt: new Date(response.data.created_at),
        starsCount: response.data.repository?.stargazers_count,
        openIssues: response.data.repository?.open_issues_count,
        forksCount: response.data.repository?.forks_count,
      };
    } catch (error) {
      localLogger.warn(`Failed to get details for ${owner}\\${name} with GitHub Container Registry integration`, {
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
      request: {
        fetch: fetchWithTrustedCertificatesAsync,
      },
      userAgent: GitHubContainerRegistryIntegration.userAgent,
      throttle: { enabled: false }, // Disable throttling for this integration, Octokit will retry by default after a set time, thus delaying the repsonse to the user in case of errors. Errors will be shown to the user, no need to retry the request.
      ...(this.hasSecretValue("personalAccessToken") ? { auth: this.getSecretValue("personalAccessToken") } : {}),
    });
  }
}
