import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { withTimeoutAsync } from "@homarr/core/infrastructure/http/timeout";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { IconRepositoryLicense } from "../types/icon-repository-license";
import type { RepositoryIcon } from "../types/repository-icon";
import type { RepositoryIconGroup } from "../types/repository-icon-group";
import { IconRepository } from "./icon-repository";

export class GitHubIconRepository extends IconRepository {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly license: IconRepositoryLicense,
    public readonly repositoryUrl?: URL,
    public readonly repositoryIndexingUrl?: URL,
    public readonly repositoryBlobUrlTemplate?: string,
  ) {
    super(name, slug, license, repositoryUrl, repositoryIndexingUrl, repositoryBlobUrlTemplate);
  }

  protected async getAllIconsInternalAsync(): Promise<RepositoryIconGroup> {
    const url = this.repositoryIndexingUrl;
    if (!url || !this.repositoryBlobUrlTemplate) {
      throw new Error("Repository URLs are required for this repository");
    }

    const response = await withTimeoutAsync(async (signal) => fetchWithTrustedCertificatesAsync(url, { signal }));
    if (!response.ok) {
      await response.body?.cancel();
      throw new ErrorWithMetadata("GitHub icon index request failed", {
        status: response.status,
        rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
        rateLimitReset: response.headers.get("x-ratelimit-reset"),
        retryAfter: response.headers.get("retry-after"),
      });
    }

    const listOfFiles = (await response.json()) as GitHubApiResponse | null;
    if (!listOfFiles || !Array.isArray(listOfFiles.tree)) {
      throw new Error("GitHub icon index response does not contain a file tree");
    }
    if (typeof listOfFiles.truncated !== "boolean") {
      throw new Error("GitHub icon index response does not contain a boolean truncated flag");
    }
    if (listOfFiles.truncated) {
      throw new Error("GitHub icon index response contains a truncated file tree");
    }

    const icons: RepositoryIcon[] = [];
    for (const { path, size, sha } of listOfFiles.tree) {
      const icon = this.createIcon(path, size, sha);
      if (icon) icons.push(icon);
    }

    return { success: true, icons, slug: this.slug };
  }
}

interface GitHubApiResponse {
  sha: string;
  url: string;
  tree: TreeItem[];
  truncated: boolean;
}

export interface TreeItem {
  path: string;
  mode: string;
  sha: string;
  url: string;
  size?: number;
}
