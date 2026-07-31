import { z } from "zod/v4";

import { integrationKinds, widgetKinds } from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";

export const integrationSchema = z.object({
  id: z.string(),
  kind: zodEnumFromArray(integrationKinds),
  name: z.string(),
  url: z.string(),
});

export type BoardItemIntegration = z.infer<typeof integrationSchema>;

export const itemAdvancedOptionsSchema = z.object({
  title: z.string().max(64).nullable().default(null),
  customCssClasses: z.array(z.string()).default([]),
  borderColor: z.string().default(""),
});

export type BoardItemAdvancedOptions = z.infer<typeof itemAdvancedOptionsSchema>;

export const sharedItemSchema = z.object({
  id: z.string(),
  layouts: z.array(
    z.object({
      layoutId: z.string(),
      yOffset: z.number(),
      xOffset: z.number(),
      width: z.number(),
      height: z.number(),
      sectionId: z.string(),
    }),
  ),
  integrationIds: z.array(z.string()),
  advancedOptions: itemAdvancedOptionsSchema,
});

export const commonItemSchema = z
  .object({
    kind: zodEnumFromArray(widgetKinds),
    options: z.record(z.string(), z.unknown()),
  })
  .and(sharedItemSchema);

export const sectionRailPlacements = ["main", "left", "right"] as const;

export const categorySectionOptionsDefaults = {
  showLabel: true,
  collapsible: true,
  showOpenAll: true,
  railPlacement: "main",
  columnCount: 2,
} as const;

export const categorySectionOptionsSchema = z
  .object({
    showLabel: z.boolean().default(categorySectionOptionsDefaults.showLabel),
    collapsible: z.boolean().default(categorySectionOptionsDefaults.collapsible),
    showOpenAll: z.boolean().default(categorySectionOptionsDefaults.showOpenAll),
    railPlacement: z.enum(sectionRailPlacements).default(categorySectionOptionsDefaults.railPlacement),
    columnCount: z.number().int().min(1).max(24).default(categorySectionOptionsDefaults.columnCount),
  })
  .default(categorySectionOptionsDefaults);

export type CategorySectionOptions = z.infer<typeof categorySectionOptionsSchema>;

const categorySectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.literal("category"),
  yOffset: z.number(),
  xOffset: z.number(),
  collapsed: z.boolean().default(true),
  options: categorySectionOptionsSchema,
});

const emptySectionSchema = z.object({
  id: z.string(),
  kind: z.literal("empty"),
  yOffset: z.number(),
  xOffset: z.number(),
});

export const dynamicSectionOptionsDefaults = {
  title: "",
  customCssClasses: [] as string[],
  borderColor: "",
  showLabel: true,
  collapsible: false,
  showOpenAll: false,
} as const;

export const dynamicSectionOptionsSchema = z
  .object({
    title: z.string().max(64).default(dynamicSectionOptionsDefaults.title),
    customCssClasses: z.array(z.string()).default([]),
    borderColor: z.string().default(dynamicSectionOptionsDefaults.borderColor),
    showLabel: z.boolean().default(dynamicSectionOptionsDefaults.showLabel),
    collapsible: z.boolean().default(dynamicSectionOptionsDefaults.collapsible),
    showOpenAll: z.boolean().default(dynamicSectionOptionsDefaults.showOpenAll),
  })
  .default(dynamicSectionOptionsDefaults);

export type DynamicSectionOptions = z.infer<typeof dynamicSectionOptionsSchema>;

const dynamicSectionSchema = z.object({
  id: z.string(),
  kind: z.literal("dynamic"),
  options: dynamicSectionOptionsSchema,
  collapsed: z.boolean().default(false),
  layouts: z.array(
    z.object({
      layoutId: z.string(),
      yOffset: z.number(),
      xOffset: z.number(),
      width: z.number(),
      height: z.number(),
      parentSectionId: z.string(),
    }),
  ),
});

export const sectionSchema = z.union([categorySectionSchema, emptySectionSchema, dynamicSectionSchema]);
