import { createI18nMiddleware as internalCreateI18nMiddleware } from "next-international/middleware";

import type { SupportedLanguage } from ".";
import { supportedLanguages } from ".";

export const createI18nMiddleware = (defaultLocale: SupportedLanguage) =>
  internalCreateI18nMiddleware({
    locales: supportedLanguages,
    defaultLocale,
    // TODO: check with new translation library if it uses the default or accepted language from browser
    resolveLocaleFromRequest() {
      return defaultLocale;
    },
    urlMappingStrategy: "rewrite",
  });
