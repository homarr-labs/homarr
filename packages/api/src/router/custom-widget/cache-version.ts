import { createHash } from "node:crypto";

interface CacheVersionDefinition {
  sources: string;
  requests: string;
  secrets: Array<{ sourceId: string; kind: string; encryptedValue: string }>;
}

export function getCustomWidgetCacheVersion(definition: CacheVersionDefinition) {
  const secrets = definition.secrets
    .map(({ sourceId, kind, encryptedValue }) => ({ sourceId, kind, encryptedValue }))
    .toSorted((left, right) => `${left.sourceId}:${left.kind}`.localeCompare(`${right.sourceId}:${right.kind}`));
  return createHash("sha256")
    .update(JSON.stringify([definition.sources, definition.requests, secrets]))
    .digest("hex")
    .slice(0, 16);
}
