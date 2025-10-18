import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ReleasesProviderIntegration } from "../interfaces/releases-providers/releases-providers-integration";
import type {
  DetailedRelease,
  ErrorResponse,
  ParsedIdentifier,
} from "../interfaces/releases-providers/releases-providers-types";
import { releasesResponseSchema } from "./linuxserverio-schemas";

const localLogger = logger.child({ module: "LinuxServerIOsIntegration" });

export class LinuxServerIOIntegration extends Integration implements ReleasesProviderIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/health"));

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  public parseIdentifier(identifier: string): ParsedIdentifier | null {
    const [owner, name] = identifier.split("/");
    if (!owner || !name) {
      localLogger.warn(
        `Invalid identifier format. Expected 'owner/name', for ${identifier} with LinuxServerIO integration`,
        { identifier },
      );
      return null;
    }
    return { owner, name };
  }

  public async getLatestMatchingReleaseAsync(
    identifier: ParsedIdentifier,
  ): Promise<DetailedRelease | ErrorResponse | null> {
    const { name } = identifier;

    const releasesResponse = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/images"));
    if (!releasesResponse.ok) {
      return { message: releasesResponse.statusText };
    }

    const releasesResponseJson: unknown = await releasesResponse.json();
    const { data, success, error } = releasesResponseSchema.safeParse(releasesResponseJson);
    if (!success) {
      return { message: error.message };
    }

    const release = data.data.repositories.linuxserver.find((repo) => repo.name === name);
    if (!release) {
      localLogger.warn(`Repository ${name} not found on provider, with LinuxServerIO integration`, {
        name,
      });
      return null;
    }

    return {
      latestRelease: release.version,
      latestReleaseAt: release.version_timestamp,
      releaseDescription: release.changelog?.shift()?.desc,
      projectUrl: release.github_url,
      projectDescription: release.description,
      isArchived: release.deprecated,
      createdAt: release.initial_date ? new Date(release.initial_date) : undefined,
      starsCount: release.stars,
    };
  }
}
