import { defineRouting } from "next-intl/routing";

import type { SupportedLanguage } from "./config";
import { supportedLanguages } from "./config";

export const createRouting = (defaultLocale: SupportedLanguage) =>
  defineRouting({
    locales: supportedLanguages,
    defaultLocale,
    localeDetection: false,
    localePrefix: {
      mode: "never", // Rewrite the URL with locale parameter but without shown in url
    },
  });
