import { z } from "zod";

export const importConfigurationSchema = z.object({
  name: z.string().optional(),
  onlyImportApps: z.boolean().default(false),
  distinctAppsByHref: z.boolean().default(true),
  screenSize: z.enum(["lg", "md", "sm"]).default("lg"),
  sidebarBehaviour: z.enum(["remove-items", "last-section"]).default("last-section"),
});

export type ImportConfiguration = z.infer<typeof importConfigurationSchema>;
