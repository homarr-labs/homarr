import { z } from "zod/v4";

import { brandingServerSettingsSchema } from "../../../../../packages/server-settings/index";
import { userPreferencesSchema } from "../../../../../packages/validation/src/user";

export const instanceSettingsSchema = z.object({
  board: z.object({
    homeBoardId: z.string().nullable(),
    mobileHomeBoardId: z.string().nullable(),
    enableStatusByDefault: z.boolean(),
    forceDisableStatus: z.boolean(),
  }),
  appearance: z.object({ defaultColorScheme: userPreferencesSchema.shape.colorScheme }),
  branding: brandingServerSettingsSchema,
  culture: z.object({ defaultLocale: z.string() }),
  user: z.object({ enableGravatar: z.boolean() }),
  search: z.object({ defaultSearchEngineId: z.string().nullable() }),
  analytics: z.object({ enableGeneral: z.boolean() }),
  crawlingAndIndexing: z.object({
    noIndex: z.boolean(),
    noFollow: z.boolean(),
    noTranslate: z.boolean(),
    noSiteLinksSearchBox: z.boolean(),
  }),
});

export const preferenceSettingsSchema = userPreferencesSchema.pick({
  homeBoardId: true,
  mobileHomeBoardId: true,
  headerPreferences: true,
  colorScheme: true,
  byteUnitSystem: true,
  firstDayOfWeek: true,
  pingIconsEnabled: true,
  enableRightClickOnWidgets: true,
  defaultSearchEngineId: true,
  openSearchInNewTab: true,
  ddgBangs: true,
});

export type InstanceSettingsValues = z.infer<typeof instanceSettingsSchema>;
export type PreferenceSettingsValues = z.infer<typeof preferenceSettingsSchema>;

export const instanceSettingsGroups = [
  "board",
  "appearance",
  "branding",
  "culture",
  "user",
  "search",
  "analytics",
  "crawlingAndIndexing",
] as const satisfies readonly (keyof InstanceSettingsValues)[];

export const preferenceSettingsFields = [
  "homeBoardId",
  "mobileHomeBoardId",
  "headerPreferences",
  "colorScheme",
  "byteUnitSystem",
  "firstDayOfWeek",
  "pingIconsEnabled",
  "enableRightClickOnWidgets",
  "defaultSearchEngineId",
  "openSearchInNewTab",
  "ddgBangs",
] as const satisfies readonly (keyof PreferenceSettingsValues)[];
