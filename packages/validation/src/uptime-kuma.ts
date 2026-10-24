import { z } from "zod/v4";

export const uptimeKumaStatusPageSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255)
  .regex(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/);
