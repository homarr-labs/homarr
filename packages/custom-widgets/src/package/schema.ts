import { z } from "zod/v4";

import { customWidgetOptionsSchema } from "../core/options-schema";
import { widgetPreviewScenariosSchema } from "./preview-scenarios";

export const CUSTOM_WIDGET_PACKAGE_SCHEMA = "homarr-widget-package-v3";
export const CUSTOM_WIDGET_SDK_VERSION = "1";
const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z][A-Za-z0-9._-]*$/u);
const exactVersion = z.string().regex(/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/u);
const packageName = z.string().regex(/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/u);
const safeKeys = (value: Record<string, unknown>) =>
  Object.keys(value).every((key) => !["__proto__", "prototype", "constructor"].includes(key));

export const widgetPackagePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (path) =>
      !path.startsWith("/") &&
      !path.includes("\\") &&
      !path.includes("\0") &&
      path.split("/").every((part) => part !== ".." && part !== "." && part.length > 0),
    "Package files must use relative paths without traversal",
  );

export const widgetPackageHandlerSchema = z
  .strictObject({
    kind: z.enum(["query", "action", "subscription", "migration"]),
    permission: z.enum(["view", "modify", "full"]).optional(),
    description: z.string().max(2048).optional(),
    inputSchema: z.record(z.string(), z.unknown()).optional(),
    guestAccess: z.boolean().default(false),
    timeoutMs: z.number().int().min(100).max(300_000).default(30_000),
  })
  .transform((handler) => {
    let permission = handler.permission;
    if (!permission) {
      permission = "view";
      if (handler.kind === "action") permission = "modify";
      if (handler.kind === "migration") permission = "full";
    }
    return { ...handler, permission };
  });

export const widgetPackageManifestSchema = z.strictObject({
  id: identifier,
  version: exactVersion,
  sdkVersion: z.literal(CUSTOM_WIDGET_SDK_VERSION),
  name: z.string().trim().min(1).max(128),
  description: z.string().max(2048).optional(),
  author: z.string().max(256).optional(),
  license: z.string().max(128).optional(),
  repository: z.string().url().optional(),
  icon: z.string().max(2048).optional(),
  screenshots: z.array(z.string().max(2048)).max(16).default([]),
  tags: z.array(z.string().max(64)).max(32).default([]),
  supportedApps: z.array(z.string().max(128)).max(32).default([]),
  storageVersion: z.number().int().positive().default(1),
  configurationVersion: z.number().int().positive().default(1),
  // Absence means scoped; keep it absent when parsing older archives so their checksums remain valid.
  styles: z.enum(["scoped", "global"]).optional(),
  migrations: z.strictObject({ configuration: identifier.optional(), storage: identifier.optional() }).optional(),
  entrypoints: z.strictObject({
    tile: widgetPackagePathSchema,
    advanced: widgetPackagePathSchema.optional(),
    configuration: widgetPackagePathSchema.optional(),
    server: widgetPackagePathSchema.optional(),
  }),
  handlers: z.record(identifier, widgetPackageHandlerSchema).refine(safeKeys).default({}),
});

export const widgetPackageConnectionSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(128),
    kind: z.enum(["http", "integration", "service"]),
    serviceType: identifier.optional(),
    optional: z.boolean().default(false),
    description: z.string().max(2048).optional(),
  })
  .refine((connection) => connection.kind !== "service" || Boolean(connection.serviceType), {
    path: ["serviceType"],
    message: "Service connections must declare a serviceType, such as mqtt, sqlite, ssh or custom",
  });

/** Shared by binding pickers, activation and portable collection imports. */
export function isWidgetConnectionCompatible(
  requirement: { kind: string; serviceType?: string },
  configuration: { kind?: unknown; serviceType?: unknown },
) {
  if (requirement.kind !== configuration.kind) return false;
  if (requirement.kind === "service") return requirement.serviceType === configuration.serviceType;
  return true;
}

export const customWidgetPackageSchema = z
  .strictObject({
    $schema: z.literal(CUSTOM_WIDGET_PACKAGE_SCHEMA),
    manifest: widgetPackageManifestSchema,
    files: z
      .record(widgetPackagePathSchema, z.string().max(5_000_000))
      .refine(safeKeys)
      .refine((files) => Object.keys(files).length <= 256, "A package may contain at most 256 source files")
      .refine(
        (files) => Object.values(files).reduce((size, file) => size + file.length, 0) <= 20_000_000,
        "Package source exceeds the 20 MB limit",
      ),
    dependencies: z.record(packageName, exactVersion).refine(safeKeys).default({}),
    connections: z.record(identifier, widgetPackageConnectionSchema).refine(safeKeys).default({}),
    options: customWidgetOptionsSchema,
    // Keep absent on older packages so their source and archive checksums remain unchanged.
    previewScenarios: widgetPreviewScenariosSchema.optional(),
  })
  .superRefine((value, ctx) => {
    for (const [surface, path] of Object.entries(value.manifest.entrypoints)) {
      if (!Object.hasOwn(value.files, path)) {
        ctx.addIssue({ code: "custom", path: ["manifest", "entrypoints", surface], message: `Missing file '${path}'` });
      }
    }
    if (Object.keys(value.manifest.handlers).length > 0 && !value.manifest.entrypoints.server) {
      ctx.addIssue({
        code: "custom",
        path: ["manifest", "entrypoints", "server"],
        message: "Handlers need a server entrypoint",
      });
    }
    for (const [kind, handler] of Object.entries(value.manifest.migrations ?? {})) {
      if (value.manifest.handlers[handler]?.kind !== "migration") {
        ctx.addIssue({
          code: "custom",
          path: ["manifest", "migrations", kind],
          message: "Migration entries must name a migration handler",
        });
      }
    }
    for (const [scenario, fixture] of Object.entries(value.previewScenarios ?? {})) {
      for (const name of Object.keys(fixture.queries)) {
        if (value.manifest.handlers[name]?.kind !== "query")
          ctx.addIssue({
            code: "custom",
            path: ["previewScenarios", scenario, "queries", name],
            message: "Preview query fixtures must reference declared query handlers",
          });
      }
    }
  });

export type CustomWidgetPackage = z.infer<typeof customWidgetPackageSchema>;
export type CustomWidgetPackageInput = z.input<typeof customWidgetPackageSchema>;
export type WidgetPackageManifest = z.infer<typeof widgetPackageManifestSchema>;
export type WidgetPackageHandler = z.infer<typeof widgetPackageHandlerSchema>;
export type WidgetPackageSurface = "tile" | "advanced" | "configuration";

export const HOST_WIDGET_MODULES = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "@mantine/core",
  "@mantine/hooks",
  "@mantine/charts",
  "@mantine/dates",
  "@tanstack/react-query",
  "@homarr/widget-sdk",
  "@homarr/widget-sdk/client",
  "@homarr/widget-sdk/ui",
  "@homarr/widget-sdk/table",
  "@homarr/widget-sdk/legacy",
] as const;
