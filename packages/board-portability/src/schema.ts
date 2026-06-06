import { z } from "zod/v4";

import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
  integrationKinds,
  sectionKinds,
  widgetKinds,
} from "@homarr/definitions";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";
import { zodEnumFromArray } from "@homarr/validation/enums";

const bundleVersionSchema = z.literal("1.0");

const bundleBoardSettingsSchema = z.object({
  pageTitle: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  logoImageUrl: z.string().nullable().optional(),
  faviconImageUrl: z.string().nullable().optional(),
  backgroundImageUrl: z.string().nullable().optional(),
  backgroundImageAttachment: z.enum(backgroundImageAttachments.values).optional(),
  backgroundImageRepeat: z.enum(backgroundImageRepeats.values).optional(),
  backgroundImageSize: z.enum(backgroundImageSizes.values).optional(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  opacity: z.number(),
  customCss: z.string().nullable().optional(),
  iconColor: z.string().nullable().optional(),
  itemRadius: z.union([z.literal("xs"), z.literal("sm"), z.literal("md"), z.literal("lg"), z.literal("xl")]),
  disableStatus: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

const bundleLayoutSchema = z.object({
  ref: z.string(),
  name: z.string(),
  columnCount: z.number(),
  breakpoint: z.number(),
});

const bundleSectionLayoutSchema = z.object({
  layoutRef: z.string(),
  parentSectionRef: z.string(),
  xOffset: z.number(),
  yOffset: z.number(),
  width: z.number(),
  height: z.number(),
});

const bundleSectionSchema = z.object({
  ref: z.string(),
  kind: zodEnumFromArray(sectionKinds),
  name: z.string().nullable().optional(),
  yOffset: z.number().nullable().optional(),
  xOffset: z.number().nullable().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  layouts: z.array(bundleSectionLayoutSchema).optional(),
});

const bundleItemLayoutSchema = z.object({
  layoutRef: z.string(),
  sectionRef: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const bundleItemSchema = z.object({
  ref: z.string(),
  kind: zodEnumFromArray(widgetKinds),
  options: z.record(z.string(), z.unknown()),
  advancedOptions: itemAdvancedOptionsSchema,
  integrationRefs: z.array(z.string()),
  appRef: z.string().optional(),
  layouts: z.array(bundleItemLayoutSchema),
});

const bundleBoardSchema = z.object({
  ref: z.string().optional(),
  name: z.string(),
  settings: bundleBoardSettingsSchema,
  layouts: z.array(bundleLayoutSchema),
  sections: z.array(bundleSectionSchema),
  items: z.array(bundleItemSchema),
});

const bundleAppSchema = z.object({
  ref: z.string(),
  name: z.string(),
  href: z.string().nullable(),
  iconUrl: z.string(),
  description: z.string().nullable().optional(),
  pingUrl: z.string().nullable().optional(),
});

const bundleIntegrationSchema = z.object({
  ref: z.string(),
  kind: zodEnumFromArray(integrationKinds),
  name: z.string(),
  url: z.string(),
  secretKinds: z.array(z.string()),
  secrets: z.literal("REDACTED"),
});

export const homarrBundleSchema = z.object({
  version: bundleVersionSchema,
  exportedAt: z.string(),
  homarrVersion: z.string(),
  boards: z.array(bundleBoardSchema).min(1),
  apps: z.array(bundleAppSchema),
  integrations: z.array(bundleIntegrationSchema),
});

export type HomarrBundle = z.infer<typeof homarrBundleSchema>;
export type HomarrBundleBoard = z.infer<typeof bundleBoardSchema>;
export type HomarrBundleApp = z.infer<typeof bundleAppSchema>;
export type HomarrBundleIntegration = z.infer<typeof bundleIntegrationSchema>;

const configBundleSecretSchema = z.object({
  kind: z.string(),
  value: z.string(),
});

const configBundleIntegrationSchema = z.object({
  ref: z.string(),
  kind: zodEnumFromArray(integrationKinds),
  name: z.string(),
  url: z.string(),
  secrets: z.array(configBundleSecretSchema),
});

const configBundleSearchEngineSchema = z.object({
  ref: z.string(),
  iconUrl: z.string(),
  name: z.string(),
  short: z.string(),
  description: z.string().nullable().optional(),
  urlTemplate: z.string().nullable().optional(),
  type: z.string(),
  integrationRef: z.string().nullable().optional(),
});

const configBundleUserSchema = z
  .object({
    ref: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    password: z.string().nullable(),
    provider: z.string(),
    homeBoardRef: z.string().nullable(),
    mobileHomeBoardRef: z.string().nullable(),
    defaultSearchEngineRef: z.string().nullable(),
    colorScheme: z.string(),
    firstDayOfWeek: z.number(),
    openSearchInNewTab: z.boolean(),
    ddgBangs: z.boolean(),
    pingIconsEnabled: z.boolean(),
  })
  .catchall(z.unknown());

const configBundleGroupSchema = z.object({
  ref: z.string(),
  name: z.string(),
  position: z.number(),
  ownerRef: z.string().nullable().optional(),
  homeBoardRef: z.string().nullable().optional(),
  mobileHomeBoardRef: z.string().nullable().optional(),
  permissions: z.array(z.string()),
  boardPermissions: z.array(
    z.object({ boardRef: z.string(), permission: z.string() }),
  ),
  integrationPermissions: z.array(
    z.object({ integrationRef: z.string(), permission: z.string() }),
  ),
  memberRefs: z.array(z.string()).optional(),
});

export const homarrConfigBundleSchema = z.object({
  version: z.literal("2.0"),
  type: z.literal("full-config"),
  exportedAt: z.string(),
  homarrVersion: z.string(),
  encryptionKey: z.string(),
  boards: z.array(bundleBoardSchema),
  apps: z.array(bundleAppSchema),
  integrations: z.array(configBundleIntegrationSchema),
  serverSettings: z.record(z.string(), z.unknown()),
  searchEngines: z.array(configBundleSearchEngineSchema),
  groups: z.array(configBundleGroupSchema),
  users: z.array(configBundleUserSchema).optional(),
});

export type HomarrConfigBundle = z.infer<typeof homarrConfigBundleSchema>;
export type ConfigBundleIntegration = z.infer<typeof configBundleIntegrationSchema>;
export type ConfigBundleGroup = z.infer<typeof configBundleGroupSchema>;
export type ConfigBundleSearchEngine = z.infer<typeof configBundleSearchEngineSchema>;
export type ConfigBundleUser = z.infer<typeof configBundleUserSchema>;
