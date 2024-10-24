import { defineRouting } from "next-intl/routing";

import { defaultLocale, supportedLanguages } from "./config";

export const routing = defineRouting({
  locales: supportedLanguages,
  defaultLocale,
  localePrefix: {
    mode: "never", // Rewrite the URL with locale parameter but without shown in url
  },
});
