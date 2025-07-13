import { Octokit, RequestError } from "octokit";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ReleasesProviderIntegration } from "../interfaces/releases-providers/releases-providers-integration";
import type { ReleasesRepository, ReleasesResponse } from "../interfaces/releases-providers/releases-providers-types";

const localLogger = logger.child({ module: "GithubPackagesIntegration" });

export class GithubPackagesIntegration extends Integration implements ReleasesProviderIntegration {
  private static readonly userAgent = "Homarr-Lab/Homarr:GithubPackagesIntegration";

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const headers: RequestInit["headers"] = {
      "User-Agent": GithubPackagesIntegration.userAgent,
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
        `Invalid identifier format. Expected 'owner/name', for ${repository.identifier} with Github Packages integration`,
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

    try {
      const releasesResponse = await api.rest.packages.getPackageForUser({
        username: owner,
        package_type: "container",
        package_name: name,
      });

      // List package versions for a package owned by a user
      // missing from octokit ??
      const versionResponse = await api.rest.packages.packages({
        username: owner,
        package_type: "container",
        package_name: name,
      });

      return {
        id: repository.id,
        projectUrl: releasesResponse.data.repository?.html_url ?? releasesResponse.data.html_url,
        projectDescription: releasesResponse.data.repository?.description ?? undefined,
        isFork: releasesResponse.data.repository?.fork,
        isArchived: releasesResponse.data.repository?.archived,
        createdAt: new Date(releasesResponse.data.created_at),
        starsCount: releasesResponse.data.repository?.stargazers_count,
        openIssues: releasesResponse.data.repository?.open_issues_count,
        forksCount: releasesResponse.data.repository?.forks_count,
        latestRelease: versionResponse.data.name,
        latestReleaseAt: new Date(versionResponse.data.updated_at),
        releaseUrl: versionResponse.data.html_url,
        releaseDescription: versionResponse.data.description ?? undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof RequestError ? error.message : String(error);

      localLogger.warn(`Failed to get releases for ${owner}\\${name} with Github Packages integration`, {
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

  private getApi() {
    return new Octokit({
      baseUrl: this.url("/").origin,
      request: {
        fetch: fetchWithTrustedCertificatesAsync,
      },
      userAgent: GithubPackagesIntegration.userAgent,
      throttle: { enabled: false }, // Disable throttling for this integration, Octokit will retry by default after a set time, thus delaying the repsonse to the user in case of errors. Errors will be shown to the user, no need to retry the request.
      ...(this.hasSecretValue("personalAccessToken") ? { auth: this.getSecretValue("personalAccessToken") } : {}),
    });
  }
}
