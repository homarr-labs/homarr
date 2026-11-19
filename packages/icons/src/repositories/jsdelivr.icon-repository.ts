import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { withTimeoutAsync } from "@homarr/core/infrastructure/http/timeout";

import type { IconRepositoryLicense } from "../types/icon-repository-license";
import type { RepositoryIcon } from "../types/repository-icon";
import type { RepositoryIconGroup } from "../types/repository-icon-group";
import { IconRepository } from "./icon-repository";

export class JsdelivrIconRepository extends IconRepository {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly license: IconRepositoryLicense,
    public readonly repositoryUrl: URL,
    public readonly repositoryIndexingUrl: URL,
    public readonly repositoryBlobUrlTemplate: string,
  ) {
    super(name, slug, license, repositoryUrl, repositoryIndexingUrl, repositoryBlobUrlTemplate);
  }

  protected async getAllIconsInternalAsync(): Promise<RepositoryIconGroup> {
    const response = await withTimeoutAsync(async (signal) =>
      fetchWithTrustedCertificatesAsync(this.repositoryIndexingUrl, { signal }),
    );
    const listOfFiles = (await response.json()) as JsdelivrApiResponse;

    const icons: RepositoryIcon[] = [];
    for (const { name, size, hash } of listOfFiles.files) {
      const icon = this.createIcon(name, size, hash);
      if (icon) icons.push(icon);
    }

    return { success: true, icons, slug: this.slug };
  }
}

interface JsdelivrApiResponse {
  files: JsdelivrFile[];
}

interface JsdelivrFile {
  name: string;
  size: number;
  hash: string;
}
