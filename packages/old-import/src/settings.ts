import { z } from "zod";

import { boardSizes } from "@homarr/old-schema";
import { validation } from "@homarr/validation";

import { zodEnumFromArray } from "../../validation/src/enums";

export const sidebarBehaviours = ["remove-items", "last-section"] as const;
export const defaultSidebarBehaviour = "last-section";
export type SidebarBehaviour = (typeof sidebarBehaviours)[number];

export const oldmarrImportConfigurationSchema = z.object({
  name: validation.board.name,
  onlyImportApps: z.boolean().default(false),
  distinctAppsByHref: z.boolean().default(true),
  screenSize: zodEnumFromArray(boardSizes).default("lg"),
  sidebarBehaviour: z.enum(sidebarBehaviours).default(defaultSidebarBehaviour),
});

export type OldmarrImportConfiguration = z.infer<typeof oldmarrImportConfigurationSchema>;

export const initialOldmarrImportSettings = oldmarrImportConfigurationSchema.pick({
  onlyImportApps: true,
  sidebarBehaviour: true,
});

export type InitialOldmarrImportSettings = z.infer<typeof initialOldmarrImportSettings>;
