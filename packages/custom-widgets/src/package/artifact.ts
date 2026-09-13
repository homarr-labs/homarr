import { z } from "zod/v4";

import { widgetPackageManifestSchema } from "./schema";

export const compiledWidgetViewSchema = z.strictObject({
  javascript: z.string(),
  css: z.string(),
  hostModules: z.array(z.string()).optional(),
});
export const customWidgetArtifactSchema = z.strictObject({
  format: z.literal("homarr-widget-artifact-v3"),
  digest: z.string().regex(/^[a-f0-9]{64}$/u),
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  manifest: widgetPackageManifestSchema,
  client: z.strictObject({
    tile: compiledWidgetViewSchema,
    advanced: compiledWidgetViewSchema.optional(),
    configuration: compiledWidgetViewSchema.optional(),
  }),
  server: z.string().optional(),
  dependencyLock: z.strictObject({
    dependencies: z.record(z.string(), z.string()),
    compilerVersion: z.string(),
    nodeVersion: z.string(),
    lockfile: z.string().optional(),
    bundledHostDependencies: z.record(z.string(), z.string()).optional(),
  }),
});

export type CompiledWidgetView = z.infer<typeof compiledWidgetViewSchema>;
export type CustomWidgetArtifact = z.infer<typeof customWidgetArtifactSchema>;
