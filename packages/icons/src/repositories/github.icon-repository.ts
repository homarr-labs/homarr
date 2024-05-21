import type { IconRepositoryLicense } from "../types/icon-repository-license";
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
    if (!this.repositoryIndexingUrl || !this.repositoryBlobUrlTemplate) {
      throw new Error("Repository URLs are required for this repository");
    }

    const response = await fetch(this.repositoryIndexingUrl);
    const listOfFiles = (await response.json()) as GitHubApiResponse;

    return {
      success: true,
      icons: listOfFiles.tree
        .filter((treeItem) =>
          this.allowedImageFileTypes.some((allowedExtension) => treeItem.path.includes(allowedExtension)),
        )
        .map((treeItem) => {
          const fileNameWithExtension = this.getFileNameWithoutExtensionFromPath(treeItem.path);

          return {
            imageUrl: new URL(this.repositoryBlobUrlTemplate!.replace("{0}", treeItem.path)),
            fileNameWithExtension: fileNameWithExtension,
            local: false,
            sizeInBytes: treeItem.size,
            checksum: treeItem.sha,
          };
        }),
      slug: this.slug,
    };
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
