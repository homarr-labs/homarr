import { createHash } from "node:crypto";

import { customWidgetArtifactSchema } from "./artifact";
import type { CustomWidgetArtifact } from "./artifact";
import { customWidgetPackageSchema } from "./schema";
import { stringifyWidgetJson } from "./json";

export function hashWidgetArtifactContent(value: unknown): string {
  return createHash("sha256").update(stringifyWidgetJson(value)).digest("hex");
}

export function assertWidgetArtifactIntegrity(input: unknown, source?: unknown): CustomWidgetArtifact {
  const artifact = customWidgetArtifactSchema.parse(input);
  const { digest, ...contents } = artifact;
  if (hashWidgetArtifactContent(contents) !== digest)
    throw new Error("Widget artifact checksum does not match its contents");
  if (source !== undefined) {
    const parsed = customWidgetPackageSchema.parse(source);
    if (
      hashWidgetArtifactContent(parsed) !== artifact.sourceDigest ||
      stringifyWidgetJson(parsed.manifest) !== stringifyWidgetJson(artifact.manifest) ||
      stringifyWidgetJson(parsed.dependencies) !== stringifyWidgetJson(artifact.dependencyLock.dependencies)
    ) {
      throw new Error("Widget artifact does not identify the supplied source package and manifest");
    }
  }
  return artifact;
}
