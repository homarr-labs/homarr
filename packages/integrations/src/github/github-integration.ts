import { createAppAuth } from "@octokit/auth-app";
import { Octokit, RequestError as OctokitRequestError } from "octokit";
import type { fetch } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationOctokitHttpErrorHandler } from "../base/errors/http";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ReleasesProviderIntegration } from "../interfaces/releases-providers/releases-providers-integration";
import { getLatestRelease } from "../interfaces/releases-providers/releases-providers-integration";
import type {
  DetailsProviderResponse,
  ReleaseProviderResponse,
  ReleasesRepository,
  ReleasesResponse,
} from "../interfaces/releases-providers/releases-providers-types";

const localLogger = logger.child({ module: "GithubIntegration" });

@HandleIntegrationErrors([integrationOctokitHttpErrorHandler])
export class GithubIntegration extends Integration implements ReleasesProviderIntegration {
  private static readonly userAgent = "Homarr-Lab/Homarr:GithubIntegration";

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const api = this.getApi(input.fetchAsync);

    if (this.hasSecretValue("personalAccessToken")) {
      await api.rest.users.getAuthenticated();
    } else if (this.hasSecretValue("githubAppId")) {
      await api.rest.apps.getInstallation({
        installation_id: Number(this.getSecretValue("githubInstallationId")),
      });
    } else {
      await api.request("GET /octocat");
    }

    return {
      success: true,
    };
  }

  public async getLatestMatchingReleaseAsync(repository: ReleasesRepository): Promise<ReleasesResponse> {
    const [owner, name] = repository.identifier.split("/");
    if (!owner || !name) {
      localLogger.warn(
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
        localLogger.warn(`No releases found, for ${repository.identifier} with Github integration`, {
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
      const errorMessage = error instanceof OctokitRequestError ? error.message : String(error);

      localLogger.warn(`Failed to get releases for ${owner}\\${name} with Github integration`, {
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
      localLogger.warn(`Failed to get details for ${owner}\\${name} with Github integration`, {
        owner,
        name,
        error: error instanceof OctokitRequestError ? error.message : String(error),
      });
      return undefined;
    }
  }

  private getAuthProperties(): Pick<OctokitOptions, "auth" | "authStrategy"> {
    if (this.hasSecretValue("personalAccessToken"))
      return {
        auth: this.getSecretValue("personalAccessToken"),
      };

    if (this.hasSecretValue("githubAppId"))
      return {
        authStrategy: createAppAuth,
        auth: {
          appId: this.getSecretValue("githubAppId"),
          installationId: this.getSecretValue("githubInstallationId"),
          privateKey: this.getSecretValue("privateKey"),
          /*cache: {
              get(key: string) {
                return cache.get(key) ?? (null as unknown as string);
              },
              set(key: string, value: string) {
                cache.set(key, value);
              },
              
            },*/
        } satisfies Parameters<typeof createAppAuth>[0],
      };

    return {};
  }

  private getApi(customFetch?: typeof fetch) {
    return new Octokit({
      baseUrl: this.url("/").origin,
      request: {
        fetch: customFetch ?? fetchWithTrustedCertificatesAsync,
      },
      userAgent: GithubIntegration.userAgent,
      // Disable throttling for this integration, Octokit will retry by default after a set time,
      // thus delaying the repsonse to the user in case of errors. Errors will be shown to the user, no need to retry the request.
      throttle: { enabled: false },
      ...this.getAuthProperties(),
    });
  }
}

type OctokitOptions = Exclude<ConstructorParameters<typeof Octokit>[0], undefined>;
