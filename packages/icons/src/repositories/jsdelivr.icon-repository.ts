import { posix } from "node:path";

import type { IconFetchResources } from "../resources";
import type { RepositoryIconGroup } from "../types";
import { IconRepository, readIndexPath, readIndexRecord, readIndexString } from "./icon-repository";
import type { IconRepositoryMetadata } from "./icon-repository";

export const parseJsdelivrIconIndex = (
  value: unknown,
  metadata: IconRepositoryMetadata,
  limits: IconFetchResources["limits"],
): RepositoryIconGroup => {
  const record = readIndexRecord(value);
  if (!Array.isArray(record.files) || record.files.length > limits.maximumFiles)
    throw new Error("Invalid or oversized jsDelivr icon file list");
  const template = metadata.repositoryBlobUrlTemplate;
  if (!template) throw new Error("Repository blob URL is required");
  const icons = record.files.flatMap((entry: unknown) => {
    const file = readIndexRecord(entry);
    const path = readIndexPath(file.name, limits.maximumPathLength);
    const parsed = posix.parse(path);
    if (![".png", ".svg", ".jpeg"].includes(parsed.ext)) return [];
    const checksum = readIndexString(file.hash, limits.maximumPathLength);
    if (typeof file.size !== "number" || !Number.isSafeInteger(file.size) || file.size < 0)
      throw new Error("Invalid jsDelivr icon size");
    return [
      {
        fileNameWithExtension: parsed.base,
        imageUrl: template.replace("{0}", path).replace("{1}", parsed.name),
        local: false,
        sizeInBytes: file.size,
        checksum,
      },
    ];
  });
  return { success: true, icons, slug: metadata.slug };
};

export class JsdelivrIconRepository extends IconRepository {
  protected async getAllIconsInternalAsync(signal?: AbortSignal): Promise<RepositoryIconGroup> {
    return parseJsdelivrIconIndex(await this.readIndexAsync(signal), this.metadata, this.resources.limits);
  }
}
