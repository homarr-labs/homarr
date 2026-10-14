import { posix } from "node:path";

import type { IconFetchResources } from "../resources";
import type { RepositoryIconGroup } from "../types";
import { IconRepository, readIndexPath, readIndexRecord, readIndexString } from "./icon-repository";
import type { IconRepositoryMetadata } from "./icon-repository";

export const parseGitHubIconIndex = (
  value: unknown,
  metadata: IconRepositoryMetadata,
  limits: IconFetchResources["limits"],
): RepositoryIconGroup => {
  const record = readIndexRecord(value);
  if (!Array.isArray(record.tree)) throw new Error("GitHub icon index response does not contain a file tree");
  if (typeof record.truncated !== "boolean")
    throw new Error("GitHub icon index response does not contain a boolean truncated flag");
  if (record.truncated) throw new Error("GitHub icon index response contains a truncated file tree");
  if (record.tree.length > limits.maximumFiles) throw new Error("GitHub icon file count exceeds its bound");
  const template = metadata.repositoryBlobUrlTemplate;
  if (!template) throw new Error("Repository blob URL is required");
  const icons = record.tree.flatMap((entry: unknown) => {
    const file = readIndexRecord(entry);
    const path = readIndexPath(file.path, limits.maximumPathLength);
    const parsed = posix.parse(path);
    if (![".png", ".svg", ".jpeg"].includes(parsed.ext)) return [];
    const checksum = readIndexString(file.sha, limits.maximumPathLength);
    if (file.size !== undefined && (typeof file.size !== "number" || !Number.isSafeInteger(file.size) || file.size < 0))
      throw new Error("Invalid GitHub icon size");
    return [
      {
        fileNameWithExtension: parsed.base,
        imageUrl: template.replace("{0}", path).replace("{1}", parsed.name),
        local: false,
        checksum,
        ...(file.size === undefined ? {} : { sizeInBytes: file.size }),
      },
    ];
  });
  return { success: true, icons, slug: metadata.slug };
};

export class GitHubIconRepository extends IconRepository {
  protected async getAllIconsInternalAsync(signal?: AbortSignal): Promise<RepositoryIconGroup> {
    return parseGitHubIconIndex(await this.readIndexAsync(signal), this.metadata, this.resources.limits);
  }
}
