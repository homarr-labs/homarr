import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

import { defaultLocale, supportedLanguages } from ".";

export const routing = defineRouting({
  locales: supportedLanguages,
  defaultLocale,
  localePrefix: {
    mode: "never",
  },
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
