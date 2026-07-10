import { z } from "zod/v4";

export const utf8EmailSchema = z.email({ pattern: z.regexes.unicodeEmail });

export const optionalEmailSchema = utf8EmailSchema.or(z.string().length(0)).optional();

export const nullableEmailSchema = utf8EmailSchema
  .or(z.literal(""))
  .transform((value) => (value === "" ? null : value))
  .optional()
  .nullable();

export const requiredNullableEmailSchema = utf8EmailSchema
  .or(z.literal(""))
  .transform((value) => (value === "" ? null : value))
  .nullable();
