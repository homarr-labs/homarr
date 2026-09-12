import { z } from "zod/v4";

import { customWidgetIdentifierSchema } from "./request-schema";

export const customWidgetSourceRenamesSchema = z
  .record(customWidgetIdentifierSchema, customWidgetIdentifierSchema)
  .refine((renames) => Object.keys(renames).length <= 64, "At most 64 source renames are supported")
  .refine(
    (renames) => new Set(Object.values(renames)).size === Object.keys(renames).length,
    "Source rename targets must be unique",
  );
