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

const gridOffsetSchema = z.number().int().min(0).max(32767);
const gridSizeSchema = z.number().int().min(1).max(32767);

export const sharedItemSchema = z.object({
  id: z.string(),
  layouts: z.array(
    z.object({
      layoutId: z.string(),
      yOffset: gridOffsetSchema,
      xOffset: gridOffsetSchema,
      width: gridSizeSchema,
      height: gridSizeSchema,
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

const emptySectionSchema = z.object({
  id: z.string(),
  kind: z.literal("empty"),
  yOffset: z.number().int(),
  xOffset: z.number().int(),
});

export const containerSectionOptionsDefaults = {
  title: "",
  customCssClasses: [] as string[],
  borderColor: "",
  showLabel: true,
  collapsible: false,
  showOpenAll: false,
  scrollable: false,
} as const;

export const containerSectionOptionsSchema = z
  .object({
    title: z.string().max(64).default(containerSectionOptionsDefaults.title),
    customCssClasses: z.array(z.string()).default([]),
    borderColor: z.string().default(containerSectionOptionsDefaults.borderColor),
    showLabel: z.boolean().default(containerSectionOptionsDefaults.showLabel),
    collapsible: z.boolean().default(containerSectionOptionsDefaults.collapsible),
    showOpenAll: z.boolean().default(containerSectionOptionsDefaults.showOpenAll),
    scrollable: z.boolean().default(containerSectionOptionsDefaults.scrollable),
  })
  .default(containerSectionOptionsDefaults);

export type ContainerSectionOptions = z.infer<typeof containerSectionOptionsSchema>;

const containerSectionSchema = z.object({
  id: z.string(),
  kind: z.literal("container"),
  options: containerSectionOptionsSchema,
  collapsed: z.boolean().default(false),
  layouts: z.array(
    z.object({
      layoutId: z.string(),
      yOffset: gridOffsetSchema,
      xOffset: gridOffsetSchema,
      width: gridSizeSchema,
      height: gridSizeSchema,
      parentSectionId: z.string(),
    }),
  ),
});

const legacyDynamicSectionSchema = containerSectionSchema
  .extend({ kind: z.literal("dynamic") })
  .transform((section) => ({ ...section, kind: "container" as const }));

export const sectionSchema = z.union([emptySectionSchema, containerSectionSchema, legacyDynamicSectionSchema]);
