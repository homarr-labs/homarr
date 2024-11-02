import { z } from "zod";

const manageSearchEngineSchema = z.object({
  name: z.string().min(1).max(64),
  short: z.string().min(1).max(8),
  iconUrl: z.string().min(1),
  urlTemplate: z.string().min(1).startsWith("http").includes("%s"),
  description: z.string().max(512).nullable(),
});

const editSearchEngineSchema = manageSearchEngineSchema
  .extend({
    id: z.string(),
  })
  .omit({ short: true });

export const searchEngineSchemas = {
  manage: manageSearchEngineSchema,
  edit: editSearchEngineSchema,
};
