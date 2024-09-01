import { z } from "zod";

import { oldmarrWidgetKinds } from "./widgets/definitions/common";

const createAreaSchema = <TType extends string, TPropertiesSchema extends z.AnyZodObject>(
  type: TType,
  propertiesSchema: TPropertiesSchema,
) =>
  z.object({
    type: z.literal(type),
    properties: propertiesSchema,
  });

const wrapperAreaSchema = createAreaSchema(
  "wrapper",
  z.object({
    id: z.string(),
  }),
);

const categoryAreaSchema = createAreaSchema(
  "category",
  z.object({
    id: z.string(),
  }),
);

const sidebarAreaSchema = createAreaSchema(
  "sidebar",
  z.object({
    location: z.union([z.literal("right"), z.literal("left")]),
  }),
);

const areaSchema = z.union([wrapperAreaSchema, categoryAreaSchema, sidebarAreaSchema]);

const sizedShapeSchema = z.object({
  location: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
});

const shapeSchema = z.object({
  lg: sizedShapeSchema,
  md: sizedShapeSchema.optional(),
  sm: sizedShapeSchema.optional(),
});

const tileBaseSchema = z.object({
  area: areaSchema,
  shape: shapeSchema,
});

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
  isDefined: z.boolean(),
});

const appIntegrationSchema = z.object({
  type: integrationSchema.optional(),
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
    integration: appIntegrationSchema,
  })
  .and(tileBaseSchema);

export const oldmarrWidgetSchema = z
  .object({
    id: z.string(),
    type: z.enum(oldmarrWidgetKinds),
    properties: z.record(z.unknown()),
  })
  .and(tileBaseSchema);

const categorySchema = z.object({
  id: z.string(),
  position: z.number(),
  name: z.string(),
});

const wrapperSchema = z.object({
  id: z.string(),
  position: z.number(),
});

const baseSearchEngineSchema = z.object({
  properties: z.object({
    openInNewTab: z.boolean(),
    enabled: z.boolean(),
  }),
});

const commonSearchEngineSchema = z
  .object({
    type: z.enum(["google", "duckDuckGo", "bing"]),
  })
  .and(baseSearchEngineSchema);

const customSearchEngineSchema = z
  .object({
    type: z.literal("custom"),
    properties: z.object({
      template: z.string(),
    }),
  })
  .and(baseSearchEngineSchema);

const searchEngineSchema = z.union([commonSearchEngineSchema, customSearchEngineSchema]);

const commonSettingsSchema = z.object({
  searchEngine: searchEngineSchema,
});

const accessSettingsSchema = z.object({
  allowGuests: z.boolean(),
});

const accessibilitySettingsSchema = z.object({
  disablePingPulse: z.boolean(),
  replacePingDotsWithIcons: z.boolean(),
});

const gridstackSettingsSchema = z.object({
  columnCountSmall: z.number(),
  columnCountMedium: z.number(),
  columnCountLarge: z.number(),
});

const layoutSettingsSchema = z.object({
  enabledLeftSidebar: z.boolean(),
  enabledRightSidebar: z.boolean(),
  enabledDocker: z.boolean(),
  enabledPing: z.boolean(),
  enabledSearchbar: z.boolean(),
});

const colorsSettingsSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  shade: z.string().optional(),
});

const customizationSettingsSchema = z.object({
  layout: layoutSettingsSchema,
  pageTitle: z.string().optional(),
  metaTitle: z.string().optional(),
  logoImageUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  backgroundImageUrl: z.string().optional(),
  backgroundImageAttachment: z.enum(["fixed", "scroll"]).optional(),
  backgroundImageSize: z.enum(["cover", "contain"]).optional(),
  backgroundImageRepeat: z.enum(["no-repeat", "repeat", "repeat-x", "repeat-y"]).optional(),
  customCss: z.string().optional(),
  colors: colorsSettingsSchema,
  appOpacity: z.number().optional(),
  gridstack: gridstackSettingsSchema,
  accessibility: accessibilitySettingsSchema,
});

const settingsSchema = z.object({
  common: commonSettingsSchema,
  customization: customizationSettingsSchema,
  access: accessSettingsSchema,
});

export const oldmarrConfigSchema = z.object({
  schemaVersion: z.number(),
  configProperties: z.object({
    name: z.string(),
  }),
  categories: z.array(categorySchema),
  wrappers: z.array(wrapperSchema),
  apps: z.array(oldmarrAppSchema),
  widgets: z.array(oldmarrWidgetSchema),
  settings: settingsSchema,
});

export type OldmarrConfig = z.infer<typeof oldmarrConfigSchema>;
export type OldmarrApp = z.infer<typeof oldmarrAppSchema>;
export type OldmarrWidget = z.infer<typeof oldmarrWidgetSchema>;
