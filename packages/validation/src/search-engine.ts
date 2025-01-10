import type { ZodTypeAny } from "zod";
import { z } from "zod";

import type { SearchEngineType } from "@homarr/definitions";

const genericSearchEngine = z.object({
  type: z.literal("generic" satisfies SearchEngineType),
  urlTemplate: z.string().min(1).startsWith("http").includes("%s"), // Only allow http and https for security reasons (javascript: is not allowed)
});

const fromIntegrationSearchEngine = z.object({
  type: z.literal("fromIntegration" satisfies SearchEngineType),
  integrationId: z.string().optional(),
});

const manageSearchEngineSchema = z.object({
  name: z.string().min(1).max(64),
  short: z.string().min(1).max(8),
  iconUrl: z.string().min(1),
  description: z.string().max(512).nullable(),
});

const createManageSearchEngineSchema = <T extends ZodTypeAny>(
  callback: (schema: typeof manageSearchEngineSchema) => T,
) =>
  z
    .discriminatedUnion("type", [genericSearchEngine, fromIntegrationSearchEngine])
    .and(callback(manageSearchEngineSchema));

const editSearchEngineSchema = createManageSearchEngineSchema((schema) =>
  schema
    .extend({
      id: z.string(),
    })
    .omit({ short: true }),
);

export const searchEngineSchemas = {
  manage: createManageSearchEngineSchema((schema) => schema),
  edit: editSearchEngineSchema,
};
