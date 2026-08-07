import { defineRouting } from "next-intl/routing";

import { localeCookieKey } from "@homarr/definitions/cookie";

import type { SupportedLanguage } from "./languages";
import { supportedLanguages } from "./languages";

export const createRouting = (defaultLocale: SupportedLanguage) =>
  defineRouting({
    locales: supportedLanguages,
    defaultLocale,
    localeCookie: {
      name: localeCookieKey,
      // 1 year
      maxAge: 60 * 60 * 24 * 365,
    },
    localePrefix: {
      mode: "never", // Rewrite the URL with locale parameter but without shown in url
    },
  });
