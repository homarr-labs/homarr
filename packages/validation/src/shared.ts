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
  customTextSize: z.number().min(0).max(10).default(1),
  customSpacing: z.number().min(0).max(10).default(1),
});

export type BoardItemAdvancedOptions = z.infer<typeof itemAdvancedOptionsSchema>;

export const sharedItemSchema = z.object({
  id: z.string(),
  xOffset: z.number(),
  yOffset: z.number(),
  height: z.number(),
  width: z.number(),
  integrationIds: z.array(z.string()),
  advancedOptions: itemAdvancedOptionsSchema,
});

export const commonItemSchema = z
  .object({
    kind: zodEnumFromArray(widgetKinds),
    options: z.record(z.unknown()),
  })
  .and(sharedItemSchema);

const createCategorySchema = <TItemSchema extends z.ZodTypeAny>(itemSchema: TItemSchema) =>
  z.object({
    id: z.string(),
    name: z.string(),
    kind: z.literal("category"),
    yOffset: z.number(),
    xOffset: z.number(),
    items: z.array(itemSchema),
    collapsed: z.boolean(),
  });

const createEmptySchema = <TItemSchema extends z.ZodTypeAny>(itemSchema: TItemSchema) =>
  z.object({
    id: z.string(),
    kind: z.literal("empty"),
    yOffset: z.number(),
    xOffset: z.number(),
    items: z.array(itemSchema),
  });

const createDynamicSchema = <TItemSchema extends z.ZodTypeAny>(itemSchema: TItemSchema) =>
  z.object({
    id: z.string(),
    kind: z.literal("dynamic"),
    yOffset: z.number(),
    xOffset: z.number(),
    width: z.number(),
    height: z.number(),
    items: z.array(itemSchema),
    parentSectionId: z.string(),
  });

export const createSectionSchema = <TItemSchema extends z.ZodTypeAny>(itemSchema: TItemSchema) =>
  z.union([createCategorySchema(itemSchema), createEmptySchema(itemSchema), createDynamicSchema(itemSchema)]);
