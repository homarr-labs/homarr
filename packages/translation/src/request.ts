import deepmerge from "deepmerge";
import { getRequestConfig } from "next-intl/server";

import { isLocaleSupported } from ".";
import type { SupportedLanguage } from ".";
import { languageMapping } from "./lang";
import { routing } from "./routing";

// This file is referenced in the `next.config.js` file. See https://next-intl-docs.vercel.app/docs/usage/configuration
export default getRequestConfig(async ({ requestLocale }) => {
  let currentLocale = await requestLocale;

  if (!currentLocale || !isLocaleSupported(currentLocale)) {
    currentLocale = routing.defaultLocale;
  }
  const typedLocale = currentLocale as SupportedLanguage;

  const languageMap = languageMapping();
  const currentMessages = (await languageMap[typedLocale]()).default;

  if (currentLocale !== routing.defaultLocale) {
    const fallbackMessages = (await languageMap[routing.defaultLocale]()).default;
    return {
      locale: currentLocale,
      messages: deepmerge(fallbackMessages, currentMessages),
    };
  }

  return {
    locale: currentLocale,
    messages: currentMessages,
  };
});
