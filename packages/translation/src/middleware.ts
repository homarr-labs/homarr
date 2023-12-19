import { createI18nMiddleware } from "next-international/middleware";

import { defaultLocale, supportedLanguages } from ".";

export const I18nMiddleware = createI18nMiddleware({
  locales: supportedLanguages,
  defaultLocale,
  urlMappingStrategy: "rewrite",
});
