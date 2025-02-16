import { z } from "zod";

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
  customCssClasses: z.array(z.string()).default([]),
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
    options: z.record(z.unknown()),
  })
  .and(sharedItemSchema);

const categorySectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.literal("category"),
  yOffset: z.number(),
  xOffset: z.number(),
  collapsed: z.boolean(),
});

const emptySectionSchema = z.object({
  id: z.string(),
  kind: z.literal("empty"),
  yOffset: z.number(),
  xOffset: z.number(),
});

const dynamicSectionSchema = z.object({
  id: z.string(),
  kind: z.literal("dynamic"),
  options: z.string().default('{"json": {}}'),
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
