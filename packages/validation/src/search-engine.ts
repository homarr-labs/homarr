import type { ZodTypeAny } from "zod/v4";
import { z } from "zod/v4";

import type { SearchEngineType } from "@homarr/definitions";
import { searchEngineTypes } from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";

/** Only http and https are allowed for security reasons, javascript: must not be usable */
export const searchEngineUrlTemplateSchema = z
  .string()
  .min(1)
  .regex(/^https?:\/\//)
  .includes("%s");

const genericSearchEngine = z.object({
  type: z.literal("generic" satisfies SearchEngineType),
  urlTemplate: searchEngineUrlTemplateSchema,
});

const fromIntegrationSearchEngine = z.object({
  type: z.literal("fromIntegration" satisfies SearchEngineType),
  integrationId: z.string().optional(),
});

const baseSearchEngineManageSchema = z.object({
  name: z.string().min(1).max(64),
  short: z.string().min(1).max(8),
  iconUrl: z.string().min(1),
  description: z.string().max(512).nullable(),
});

const createManageSearchEngineSchema = <T extends ZodTypeAny>(
  callback: (schema: typeof baseSearchEngineManageSchema) => T,
) =>
  z
    .discriminatedUnion("type", [genericSearchEngine, fromIntegrationSearchEngine])
    .and(callback(baseSearchEngineManageSchema));

export const searchEngineManageSchema = createManageSearchEngineSchema((schema) => schema);

export const searchEngineEditSchema = createManageSearchEngineSchema((schema) =>
  schema
    .extend({
      id: z.string(),
    })
    .omit({ short: true }),
);

/**
 * Flat variants of the schemas above.
 *
 * A discriminated union cannot be represented as an OpenAPI request body, so the type specific
 * properties are accepted for both types here and the combination is checked by the router.
 * They are nullish because the management forms submit the whole row, which carries a `null`
 * for the property of the other type and an empty string for a field that was never filled in.
 */
const searchEngineTypeSpecificShape = {
  type: zodEnumFromArray(searchEngineTypes),
  urlTemplate: z.string().nullish(),
  integrationId: z.string().nullish(),
};

export const searchEngineApiManageSchema = baseSearchEngineManageSchema.extend(searchEngineTypeSpecificShape);

export const searchEngineApiEditSchema = baseSearchEngineManageSchema
  .omit({ short: true })
  .extend({ id: z.string() })
  .extend(searchEngineTypeSpecificShape);
