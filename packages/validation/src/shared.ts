import { z } from "zod";

import { integrationKinds, widgetKinds } from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";

export const integrationSchema = z.object({
  id: z.string(),
  kind: zodEnumFromArray(integrationKinds),
  name: z.string(),
  url: z.string(),
});

export const sharedItemSchema = z.object({
  id: z.string(),
  xOffset: z.number(),
  yOffset: z.number(),
  height: z.number(),
  width: z.number(),
  integrations: z.array(integrationSchema),
});

export const commonItemSchema = z
  .object({
    kind: zodEnumFromArray(widgetKinds),
    options: z.record(z.unknown()),
  })
  .and(sharedItemSchema);

const createRootSectionSchema = <TItemSchema extends z.ZodTypeAny>(
  itemSchema: TItemSchema,
) =>
  z.object({
    id: z.string(),
    kind: z.literal("root"),
    xOffset: z.number(),
    yOffset: z.number(),
    height: z.number(),
    width: z.number(),
    parentSectionId: z.null(),
    columnCount: z.number(),
    items: z.array(itemSchema),
  });

const createCardSectionSchema = <TItemSchema extends z.ZodTypeAny>(
  itemSchema: TItemSchema,
) =>
  z.object({
    id: z.string(),
    kind: z.literal("card"),
    xOffset: z.number(),
    yOffset: z.number(),
    height: z.number(),
    width: z.number(),
    parentSectionId: z.string(),
    columnCount: z.number(),
    items: z.array(itemSchema),
  });

export const createSectionSchema = <TItemSchema extends z.ZodTypeAny>(
  itemSchema: TItemSchema,
) =>
  z.union([
    createRootSectionSchema(itemSchema),
    createCardSectionSchema(itemSchema),
  ]);
