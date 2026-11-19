import { parse } from "node:path";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { IconRepositoryLicense } from "../types/icon-repository-license";
import type { RepositoryIcon } from "../types/repository-icon";
import type { RepositoryIconGroup } from "../types/repository-icon-group";

const logger = createLogger({ module: "iconRepository" });

export abstract class IconRepository {
  protected readonly allowedImageFileTypes = [".png", ".svg", ".jpeg"];

  protected constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly license: IconRepositoryLicense,
    public readonly repositoryUrl?: URL,
    public readonly repositoryIndexingUrl?: URL,
    public readonly repositoryBlobUrlTemplate?: string,
  ) {}

  public async getAllIconsAsync(): Promise<RepositoryIconGroup> {
    try {
      return await this.getAllIconsInternalAsync();
    } catch (err) {
      logger.error(
        new ErrorWithMetadata("Unable to request icons from repository", { slug: this.slug }, { cause: err }),
      );
      return {
        success: false,
        icons: [],
        slug: this.slug,
      };
    }
  }

  protected createIcon(path: string, sizeInBytes: number | undefined, checksum: string): RepositoryIcon | null {
    const file = parse(path);
    if (!this.allowedImageFileTypes.includes(file.ext)) return null;
    if (!this.repositoryBlobUrlTemplate) {
      throw new Error("Repository blob URL template is required for this repository");
    }

    return {
      imageUrl: this.repositoryBlobUrlTemplate.replace("{0}", path).replace("{1}", file.name),
      fileNameWithExtension: file.base,
      local: false,
      sizeInBytes,
      checksum,
    };
  }

  protected abstract getAllIconsInternalAsync(): Promise<RepositoryIconGroup>;
}
