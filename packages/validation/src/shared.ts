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
  integrations: z.array(integrationSchema),
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
    position: z.number(),
    items: z.array(itemSchema),
  });

const createEmptySchema = <TItemSchema extends z.ZodTypeAny>(itemSchema: TItemSchema) =>
  z.object({
    id: z.string(),
    kind: z.literal("empty"),
    position: z.number(),
    items: z.array(itemSchema),
  });

export const createSectionSchema = <TItemSchema extends z.ZodTypeAny>(itemSchema: TItemSchema) =>
  z.union([createCategorySchema(itemSchema), createEmptySchema(itemSchema)]);
