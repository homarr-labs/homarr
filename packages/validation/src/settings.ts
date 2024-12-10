import { z } from "zod";

const initSettingsSchema = z.object({
  analytics: z.object({
    enableGeneral: z.boolean(),
    enableWidgetData: z.boolean(),
    enableIntegrationData: z.boolean(),
    enableUserData: z.boolean(),
  }),
  crawlingAndIndexing: z.object({
    noIndex: z.boolean(),
    noFollow: z.boolean(),
    noTranslate: z.boolean(),
    noSiteLinksSearchBox: z.boolean(),
  }),
});

export const settingsSchemas = {
  init: initSettingsSchema,
};
