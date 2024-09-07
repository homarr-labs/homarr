import { z } from "zod";

import { tileBaseSchema } from "./tile";

const appBehaviourSchema = z.object({
  externalUrl: z.string(),
  isOpeningNewTab: z.boolean(),
  tooltipDescription: z.string().optional(),
});

const appNetworkSchema = z.object({
  enabledStatusChecker: z.boolean(),
  okStatus: z.array(z.number()).optional(),
  statusCodes: z.array(z.string()),
});

const appAppearanceSchema = z.object({
  iconUrl: z.string(),
  appNameStatus: z.union([z.literal("normal"), z.literal("hover"), z.literal("hidden")]),
  positionAppName: z.union([
    z.literal("row"),
    z.literal("column"),
    z.literal("row-reverse"),
    z.literal("column-reverse"),
  ]),
  appNameFontSize: z.number(),
  lineClampAppName: z.number(),
});

const integrationSchema = z.enum([
  "readarr",
  "radarr",
  "sonarr",
  "lidarr",
  "prowlarr",
  "sabnzbd",
  "jellyseerr",
  "overseerr",
  "deluge",
  "qBittorrent",
  "transmission",
  "plex",
  "jellyfin",
  "nzbGet",
  "pihole",
  "adGuardHome",
  "homeAssistant",
  "openmediavault",
  "proxmox",
  "tdarr",
]);

const appIntegrationPropertySchema = z.object({
  type: z.enum(["private", "public"]),
  field: z.enum(["apiKey", "password", "username"]),
  value: z.string().nullable().optional(),
  isDefined: z.boolean().optional(),
});

const appIntegrationSchema = z.object({
  type: integrationSchema.optional().nullable(),
  properties: z.array(appIntegrationPropertySchema),
});

export const oldmarrAppSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    behaviour: appBehaviourSchema,
    network: appNetworkSchema,
    appearance: appAppearanceSchema,
    integration: appIntegrationSchema.optional(),
  })
  .and(tileBaseSchema);

export type OldmarrApp = z.infer<typeof oldmarrAppSchema>;
