import { createHash } from "node:crypto";

import type { LocalIconMedia, LocalIconResources } from "../resources";
import type { RepositoryIcon, RepositoryIconGroup } from "../types";

export const LOCAL_ICON_REPOSITORY_SLUG = "local";
export const createLocalImageUrl = (id: string) => `/api/user-medias/${id}`;

export const mapMediaToIcon = (media: LocalIconMedia): RepositoryIcon => ({
  local: true,
  fileNameWithExtension: media.name,
  imageUrl: createLocalImageUrl(media.id),
  checksum: createHash("md5").update(media.content).digest("hex"),
  sizeInBytes: media.size,
});

export class LocalIconRepository {
  readonly name = "Local";
  readonly slug = LOCAL_ICON_REPOSITORY_SLUG;
  readonly license = undefined;

  constructor(private readonly resources: LocalIconResources) {}

  async getAllIconsAsync(signal?: AbortSignal): Promise<RepositoryIconGroup> {
    signal?.throwIfAborted();
    await this.resources.assertCurrentAuthorityAsync(signal);
    signal?.throwIfAborted();
    let icons: RepositoryIcon[];
    try {
      const medias = await this.resources.readMediasAsync(signal);
      signal?.throwIfAborted();
      icons = medias.map(mapMediaToIcon);
    } catch (error) {
      signal?.throwIfAborted();
      this.resources.reportSourceError(error, { slug: this.slug, kind: "unavailable" });
      return { success: false, icons: [], slug: this.slug, failure: "source-unavailable" };
    }
    await this.resources.assertCurrentAuthorityAsync(signal);
    signal?.throwIfAborted();
    return { success: true, icons, slug: this.slug };
  }
}
