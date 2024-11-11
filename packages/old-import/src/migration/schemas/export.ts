import { z } from "zod";

export const oldmarrExportSettingsSchema = z.object({
  boards: z.boolean(),
  integrations: z.boolean(),
  users: z.boolean(),
});
export type OldmarrExportSettings = z.infer<typeof oldmarrExportSettingsSchema>;
