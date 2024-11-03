import { createHash } from "crypto";

import { db } from "@homarr/db";

import type { RepositoryIconGroup } from "../types";
import { IconRepository } from "./icon-repository";

export class LocalIconRepository extends IconRepository {
  constructor() {
    super("Local", "local", undefined, undefined, undefined, undefined);
  }
  protected async getAllIconsInternalAsync(): Promise<RepositoryIconGroup> {
    const medias = await db.query.medias.findMany();
    return {
      success: true,
      icons: medias.map((media) => ({
        local: true,
        fileNameWithExtension: media.name,
        imageUrl: `/api/user-medias/${media.id}`,
        checksum: createHash("md5").update(media.content).digest("hex"),
        sizeInBytes: media.size,
      })),
      slug: "local",
    };
  }
}
