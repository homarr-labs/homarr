import type { z } from "zod/v4";

// tRPC normalizes strings before checking their bounds. JSON Schema constrains the raw
// request, so transport documentation must not reject input the native parser accepts.
export const normalizeInputSchema: NonNullable<z.core.ToJSONSchemaParams["override"]> = ({ zodSchema, jsonSchema }) => {
  if (zodSchema["_zod"].def.type !== "string") return;
  if (zodSchema["_zod"].def.checks?.some((check) => check["_zod"].def.check === "overwrite")) {
    delete jsonSchema.minLength;
    delete jsonSchema.maxLength;
    delete jsonSchema.pattern;
    delete jsonSchema.allOf;
    delete jsonSchema.format;
  }
  // Zod's ISO parser also accepts minute precision, which date-time format excludes.
  if (jsonSchema.format === "date-time" && typeof jsonSchema.pattern === "string") delete jsonSchema.format;
};
