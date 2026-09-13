import { z } from "zod/v4";

import { colorSchemes } from "@homarr/definitions";
import { supportedLanguages } from "@homarr/translation";

import { zodEnumFromArray } from "./enums";

export const serverSettingSchemas = {
  analytics: z.strictObject({
    enableGeneral: z.boolean(),
    instanceId: z.string().nullable(),
  }),
  crawlingAndIndexing: z.strictObject({
    noIndex: z.boolean(),
    noFollow: z.boolean(),
    noTranslate: z.boolean(),
    noSiteLinksSearchBox: z.boolean(),
  }),
  board: z.strictObject({
    homeBoardId: z.string().nullable(),
    mobileHomeBoardId: z.string().nullable(),
    enableStatusByDefault: z.boolean(),
    forceDisableStatus: z.boolean(),
  }),
  user: z.strictObject({
    enableGravatar: z.boolean(),
  }),
  appearance: z.strictObject({
    defaultColorScheme: zodEnumFromArray(colorSchemes),
  }),
  culture: z.strictObject({
    defaultLocale: zodEnumFromArray(supportedLanguages),
  }),
  search: z.strictObject({
    defaultSearchEngineId: z.string().nullable(),
  }),
};

export const serverSettingsSchema = z.strictObject(serverSettingSchemas);

export const serverSettingsUpdateSchema = z.strictObject({
  analytics: serverSettingSchemas.analytics.partial().optional(),
  crawlingAndIndexing: serverSettingSchemas.crawlingAndIndexing.partial().optional(),
  board: serverSettingSchemas.board.partial().optional(),
  user: serverSettingSchemas.user.partial().optional(),
  appearance: serverSettingSchemas.appearance.partial().optional(),
  culture: serverSettingSchemas.culture.partial().optional(),
  search: serverSettingSchemas.search.partial().optional(),
});

export const settingsInitSchema = z.object({
  analytics: z.object({
    enableGeneral: z.boolean(),
  }),
  crawlingAndIndexing: z.object({
    noIndex: z.boolean(),
    noFollow: z.boolean(),
    noTranslate: z.boolean(),
    noSiteLinksSearchBox: z.boolean(),
  }),
});
