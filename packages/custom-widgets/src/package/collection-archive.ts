import { stat, readFile } from "node:fs/promises";

import {
  customWidgetCollectionSchema,
  widgetCollectionContentsSchema,
  WIDGET_COLLECTION_MAX_BYTES,
} from "./collection";
import type { CustomWidgetCollection, WidgetCollectionContents } from "./collection";
import { assertWidgetArtifactIntegrity, hashWidgetArtifactContent } from "./integrity";

export function validateWidgetCollectionArchive(input: unknown): CustomWidgetCollection {
  if (Buffer.byteLength(JSON.stringify(input)) > WIDGET_COLLECTION_MAX_BYTES)
    throw new Error("Widget collection exceeds the 128 MiB limit");
  const collection = customWidgetCollectionSchema.parse(input);
  const { digest, ...contents } = collection;
  if (hashWidgetArtifactContent(contents) !== digest)
    throw new Error("Widget collection checksum does not match its contents");
  for (const entry of collection.widgets) {
    try {
      assertWidgetArtifactIntegrity(entry.archive.artifact, entry.archive.source);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid artifact";
      throw new Error(`Widget '${entry.key}': ${message}`, { cause: error });
    }
  }
  return collection;
}

export function createWidgetCollectionArchive(input: WidgetCollectionContents): CustomWidgetCollection {
  const contents = widgetCollectionContentsSchema.parse(input);
  return validateWidgetCollectionArchive({ ...contents, digest: hashWidgetArtifactContent(contents) });
}

export async function loadWidgetCollectionArchive(path: string): Promise<CustomWidgetCollection> {
  if ((await stat(path)).size > WIDGET_COLLECTION_MAX_BYTES)
    throw new Error("Widget collection exceeds the 128 MiB limit");
  return validateWidgetCollectionArchive(JSON.parse(await readFile(path, "utf8")));
}
