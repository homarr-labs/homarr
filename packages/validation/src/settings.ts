import { z } from "zod/v4";

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
