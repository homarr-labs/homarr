import { defineRouting } from "next-intl/routing";

import { localeCookieKey } from "@homarr/definitions";

import type { SupportedLanguage } from "./config";
import { supportedLanguages } from "./config";

export const createRouting = (defaultLocale: SupportedLanguage) =>
  defineRouting({
    locales: supportedLanguages,
    defaultLocale,
    localeCookie: {
      name: localeCookieKey,
    },
    localePrefix: {
      mode: "never", // Rewrite the URL with locale parameter but without shown in url
    },
  });
