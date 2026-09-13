import { z } from "zod/v4";

import { isRecord } from "@homarr/common";
import {
  widgetCollectionConnectionsSchema,
  widgetCollectionKeySchema,
  widgetCollectionManifestSchema,
  widgetPortableOriginSchema,
} from "@homarr/custom-widgets/package";
import type { WidgetPortableOrigin } from "@homarr/custom-widgets/package";

export const installedWidgetCollectionSchema = z.strictObject({
  importId: z.string(),
  digest: z.string(),
  manifest: widgetCollectionManifestSchema,
  connections: widgetCollectionConnectionsSchema,
  key: widgetCollectionKeySchema,
  mapping: z.record(widgetCollectionKeySchema, widgetCollectionKeySchema),
  options: z.record(widgetCollectionKeySchema, z.json()),
});
export type InstalledWidgetCollection = z.infer<typeof installedWidgetCollectionSchema>;

function readOrigin(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (isRecord(value)) return value;
  } catch {
    /* Malformed provenance must not make management unavailable. */
  }
  return null;
}

export function readInstalledWidgetCollection(raw: string | null): InstalledWidgetCollection | null {
  const parsed = installedWidgetCollectionSchema.safeParse(readOrigin(raw)?.collection);
  if (!parsed.success) return null;
  return parsed.data;
}

/** Keep the collection placement blueprint when a normal package update replaces upstream provenance. */
export function preserveWidgetCollectionOrigin(raw: string | null, nextOrigin: object) {
  const collection = readInstalledWidgetCollection(raw);
  if (!collection) return nextOrigin;
  return { ...nextOrigin, collection };
}

/** Export only documented attribution fields, never arbitrary local origin metadata. */
export function readPortableWidgetOrigin(raw: string | null): WidgetPortableOrigin | undefined {
  const value = readOrigin(raw);
  if (!value) return undefined;
  const { collection: _collection, authorName: _authorName, ...origin } = value;
  const direct = widgetPortableOriginSchema.safeParse(origin);
  if (direct.success) return direct.data;
  if (value.kind !== undefined || typeof value.forkedFrom !== "string") return undefined;
  const upstream = readPortableWidgetOrigin(typeof value.origin === "string" ? value.origin : null);
  let workshopUpstream;
  if (upstream?.kind === "workshop") workshopUpstream = upstream;
  if (upstream?.kind === "fork") workshopUpstream = upstream.upstream;
  const parsed = widgetPortableOriginSchema.safeParse({
    kind: "fork",
    packageId: value.forkedFrom,
    artifactDigest: value.artifact ?? undefined,
    upstream: workshopUpstream,
  });
  if (parsed.success) return parsed.data;
  return undefined;
}
