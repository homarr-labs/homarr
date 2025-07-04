import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ReleasesProviderIntegration } from "../interfaces/releases-providers/releases-providers-integration";
import { getLatestRelease } from "../interfaces/releases-providers/releases-providers-integration";
import type { ReleasesRepository, ReleasesResponse } from "../interfaces/releases-providers/releases-providers-types";

export class NPMIntegration extends Integration implements ReleasesProviderIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/"));

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  public async getLatestMatchingReleaseAsync(repository: ReleasesRepository): Promise<ReleasesResponse> {
    const releasesResponse = await fetchWithTrustedCertificatesAsync(
      this.url(`/${encodeURIComponent(repository.identifier)}`),
    );

    if (!releasesResponse.ok) {
      return {
        id: repository.id,
        error: { message: releasesResponse.statusText },
      };
    }

    const releasesResponseJson: unknown = await releasesResponse.json();
    const releasesResult = z
      .object({
        time: z.record(z.string().transform((value) => new Date(value))).transform((version) =>
          Object.entries(version).map(([key, value]) => ({
            latestRelease: key,
            latestReleaseAt: value,
          })),
        ),
        versions: z.record(z.object({ description: z.string() })),
        name: z.string(),
      })
      .transform((resp) => {
        return resp.time.map((release) => ({
          ...release,
          releaseUrl: `https://www.npmjs.com/package/${resp.name}/v/${release.latestRelease}`,
          releaseDescription: resp.versions[release.latestRelease]?.description ?? "",
        }));
      })
      .safeParse(releasesResponseJson);

    if (!releasesResult.success) {
      return {
        id: repository.id,
        error: {
          message: releasesResponseJson ? JSON.stringify(releasesResponseJson, null, 2) : releasesResult.error.message,
        },
      };
    } else {
      return getLatestRelease(releasesResult.data, repository);
    }
  }
}
