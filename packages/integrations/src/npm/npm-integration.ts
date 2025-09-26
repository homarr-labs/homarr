import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

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
} from "../interfaces/releases-providers/releases-providers-types";
import { releasesResponseSchema } from "./npm-schemas";

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

  public parseIdentifier(identifier: string): ParsedIdentifier {
    return { owner: "", name: identifier };
  }

  public async getLatestMatchingReleaseAsync(
    identifier: ParsedIdentifier,
    versionRegex?: string,
  ): Promise<DetailedRelease | ErrorResponse | null> {
    const releasesResponse = await fetchWithTrustedCertificatesAsync(
      this.url(`/${encodeURIComponent(identifier.name)}`),
    );
    if (!releasesResponse.ok) {
      return { message: releasesResponse.statusText };
    }

    const releasesResponseJson: unknown = await releasesResponse.json();
    const { data, success, error } = releasesResponseSchema.safeParse(releasesResponseJson);
    if (!success) {
      return {
        message: releasesResponseJson ? JSON.stringify(releasesResponseJson, null, 2) : error.message,
      };
    }

    const formattedReleases = data.time.map((tag) => ({
      ...tag,
      releaseUrl: `https://www.npmjs.com/package/${encodeURIComponent(data.name)}/v/${encodeURIComponent(tag.latestRelease)}`,
      releaseDescription: data.versions[tag.latestRelease]?.description ?? "",
    }));
    const latestRelease = getLatestRelease(formattedReleases, versionRegex);
    if (!latestRelease) return null;

    return latestRelease;
  }
}
