import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

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

  protected async getAllIconsInternalAsync(etag?: string): Promise<RepositoryIconGroup> {
    const response = await fetchWithTrustedCertificatesAsync(this.repositoryIndexingUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: etag === undefined ? undefined : { "If-None-Match": etag },
    });
    if (response.status === 304 && etag !== undefined) return { status: "unchanged", slug: this.slug };
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`jsDelivr icon index request failed (${response.status})`);
    }
    const listOfFiles = (await response.json()) as JsdelivrApiResponse;

    const icons: RepositoryIcon[] = [];
    for (const { name, size, hash } of listOfFiles.files) {
      const icon = this.createIcon(name, size, hash);
      if (icon) icons.push(icon);
    }

    return { status: "updated", icons, slug: this.slug, etag: response.headers.get("etag") ?? undefined };
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
