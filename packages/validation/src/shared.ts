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

export const paginatedSchema = z.object({
  search: z.string().optional(),
  pageSize: z.number().int().positive().default(10),
  page: z.number().int().positive().default(1),
});

export const byIdSchema = z.object({
  id: z.string(),
});
