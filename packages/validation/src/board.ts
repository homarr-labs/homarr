import { z } from "zod";

import { commonItemSchema, createSectionSchema } from "./shared";

const boardNameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9-\\._]+$/);

const byNameSchema = z.object({
  name: boardNameSchema,
});

const saveGeneralSettingsSchema = z.object({
  pageTitle: z
    .string()
    .nullable()
    .transform((value) => (value?.trim().length === 0 ? null : value)),
  metaTitle: z
    .string()
    .nullable()
    .transform((value) => (value?.trim().length === 0 ? null : value)),
  logoImageUrl: z
    .string()
    .nullable()
    .transform((value) => (value?.trim().length === 0 ? null : value)),
  faviconImageUrl: z
    .string()
    .nullable()
    .transform((value) => (value?.trim().length === 0 ? null : value)),
});

const saveSchema = z.object({
  name: boardNameSchema,
  sections: z.array(createSectionSchema(commonItemSchema)),
});

export const boardSchemas = {
  byName: byNameSchema,
  saveGeneralSettings: saveGeneralSettingsSchema,
  save: saveSchema,
};
