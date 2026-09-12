import { z } from "zod/v4";

import { getCustomWidgetDefaultOptions, validateCustomWidgetOptions } from "../core/options";
import { customWidgetArchiveSchema } from "./archive";
import { isWidgetConnectionCompatible, widgetPackageConnectionSchema, widgetPackageManifestSchema } from "./schema";

export const WIDGET_COLLECTION_MAX_BYTES = 128 * 1024 * 1024;
export const widgetCollectionKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z][A-Za-z0-9._-]*$/u)
  .refine((key) => !["__proto__", "prototype", "constructor"].includes(key), "Reserved collection key");

export const widgetCollectionManifestSchema = widgetPackageManifestSchema.pick({
  id: true,
  version: true,
  name: true,
  description: true,
  author: true,
  license: true,
});

const digest = z.string().regex(/^[a-f0-9]{64}$/u);
const publicUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
  }, "Attribution URLs must omit credentials, query parameters and fragments");

export const widgetPortableWorkshopOriginSchema = z.strictObject({
  kind: z.literal("workshop"),
  workshopApiUrl: publicUrl,
  submissionId: z.string().max(128),
  releaseId: z.string().max(128),
  version: z.string().max(128),
  sourceDigest: digest,
  artifactDigest: digest.or(z.literal("")),
  author: z.string().max(256),
  forkedFrom: z.string().max(128),
});
export const widgetPortableOriginSchema = z.union([
  widgetPortableWorkshopOriginSchema,
  z.strictObject({
    kind: z.literal("fork"),
    packageId: z.string().max(128),
    artifactDigest: digest.optional(),
    upstream: widgetPortableWorkshopOriginSchema.optional(),
  }),
]);

export const widgetCollectionConnectionsSchema = z
  .record(widgetCollectionKeySchema, widgetPackageConnectionSchema)
  .refine((value) => Object.keys(value).length <= 128, "Collections support at most 128 connection slots");

export const widgetCollectionEntrySchema = z.strictObject({
  key: widgetCollectionKeySchema,
  name: z.string().trim().min(1).max(128).optional(),
  archive: customWidgetArchiveSchema,
  connections: z.record(widgetCollectionKeySchema, widgetCollectionKeySchema).default({}),
  options: z.record(widgetCollectionKeySchema, z.json()).default({}),
  origin: widgetPortableOriginSchema.optional(),
});

export const widgetCollectionContentsSchema = z
  .strictObject({
    format: z.literal("homarr-widget-collection-v1"),
    manifest: widgetCollectionManifestSchema,
    connections: widgetCollectionConnectionsSchema.default({}),
    widgets: z.array(widgetCollectionEntrySchema).min(1).max(32),
  })
  .superRefine((collection, ctx) => {
    const keys = new Set<string>();
    collection.widgets.forEach((entry, index) => {
      const issue = (path: string[], message: string) =>
        ctx.addIssue({
          code: "custom",
          path: ["widgets", index, ...path],
          message: `Widget '${entry.key}': ${message}`,
        });
      if (keys.has(entry.key)) issue(["key"], "entry keys must be unique");
      keys.add(entry.key);
      const requirements = entry.archive.source.connections;
      for (const [name, slot] of Object.entries(entry.connections)) {
        const requirement = requirements[name];
        const shared = collection.connections[slot];
        if (!requirement) issue(["connections", name], "unknown package connection");
        else if (!shared) issue(["connections", name], `collection slot '${slot}' is undeclared`);
        else if (!isWidgetConnectionCompatible(requirement, shared))
          issue(["connections", name], `slot '${slot}' requires compatible ${requirement.kind} settings`);
        else if (Boolean(requirement.multiple) !== Boolean(shared.multiple))
          issue(["connections", name], `slot '${slot}' must use the same repeatable connection setting`);
        else if (!requirement.optional && shared.optional)
          issue(["connections", name], `slot '${slot}' must be required because this widget requires it`);
      }
      for (const [name, requirement] of Object.entries(requirements)) {
        if (!requirement.optional && !entry.connections[name])
          issue(["connections", name], "required connection needs a collection slot");
      }
      const values = { ...getCustomWidgetDefaultOptions(entry.archive.source.options), ...entry.options };
      for (const invalid of validateCustomWidgetOptions(entry.archive.source.options, values))
        issue(["options", invalid.path.replace(/^configuration\./u, "")], invalid.message);
    });
  });

export const customWidgetCollectionSchema = widgetCollectionContentsSchema.safeExtend({ digest });
export type CustomWidgetCollection = z.infer<typeof customWidgetCollectionSchema>;
export type WidgetCollectionContents = z.input<typeof widgetCollectionContentsSchema>;
export type WidgetCollectionManifest = z.infer<typeof widgetCollectionManifestSchema>;
export type WidgetPortableOrigin = z.infer<typeof widgetPortableOriginSchema>;
