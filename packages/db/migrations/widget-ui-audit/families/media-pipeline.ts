import type { WidgetUiAuditFamily } from "../types";

export const mediaPipelineFamily = {
  id: "media-pipeline",
  name: "Media pipeline",
  description: "Release, missing media, transcoding, and indexer workflows.",
  kinds: ["mediaTranscoding", "mediaMissing", "mediaReleases", "releases", "indexerManager"],
} satisfies WidgetUiAuditFamily;
