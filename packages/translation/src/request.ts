import deepmerge from "deepmerge";
import { getRequestConfig } from "next-intl/server";

import { fallbackLocale, isLocaleSupported } from ".";
import type { SupportedLanguage } from "./config";
import { createLanguageMapping } from "./mapping";

// This file is referenced in the `next.config.js` file. See https://next-intl-docs.vercel.app/docs/usage/configuration
export default getRequestConfig(async ({ requestLocale }) => {
  let currentLocale = await requestLocale;

  if (!currentLocale || !isLocaleSupported(currentLocale)) {
    currentLocale = fallbackLocale;
  }
  const typedLocale = currentLocale as SupportedLanguage;

  const languageMap = createLanguageMapping();
  const currentMessages = (await languageMap[typedLocale]()).default;

  // Fallback to default locale if the current locales messages if not all messages are present
  if (currentLocale !== fallbackLocale) {
    const fallbackMessages = (await languageMap[fallbackLocale]()).default;
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
