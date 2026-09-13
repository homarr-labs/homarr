import { z } from "zod/v4";

import { customWidgetArtifactSchema } from "./artifact";
import { customWidgetPackageSchema } from "./schema";

export const customWidgetArchiveSchema = z.strictObject({
  format: z.literal("homarr-widget-archive-v3"),
  source: customWidgetPackageSchema,
  artifact: customWidgetArtifactSchema,
});
export type CustomWidgetArchive = z.infer<typeof customWidgetArchiveSchema>;
