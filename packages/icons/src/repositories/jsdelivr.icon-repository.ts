import type { IconRepositoryLicense } from "../types/icon-repository-license";
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
    const response = await fetch(this.repositoryIndexingUrl);
    const listOfFiles = (await response.json()) as JsdelivrApiResponse;

    return {
      success: true,
      icons: listOfFiles.files
        .filter((file) =>
          this.allowedImageFileTypes.some((allowedImageFileType) => file.name.includes(allowedImageFileType)),
        )
        .map((file) => {
          const fileNameWithExtension = this.getFileNameWithoutExtensionFromPath(file.name);

          return {
            imageUrl: new URL(this.repositoryBlobUrlTemplate.replace("{0}", file.name)),
            fileNameWithExtension: fileNameWithExtension,
            local: false,
            sizeInBytes: file.size,
            checksum: file.hash,
          };
        }),
      slug: this.slug,
    };
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
