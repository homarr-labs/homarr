import deepmerge from "deepmerge";
import { getRequestConfig } from "next-intl/server";

import type { TranslationObject } from ".";
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
  const currentMessages = removeEmptyTranslations((await languageMap[typedLocale]()).default) as TranslationObject;

  // Fallback to default locale if the current locales messages if not all messages are present
  if (currentLocale !== fallbackLocale) {
    const fallbackMessages = (await languageMap[fallbackLocale]()).default;
    return {
      locale: typedLocale,
      messages: deepmerge(fallbackMessages, currentMessages),
    };
  }

  return {
    locale: currentLocale,
    messages: currentMessages,
  };
});

const removeEmptyTranslations = (translations: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(translations)) {
    let translation = value;
    if (typeof value !== "string") {
      translation = removeEmptyTranslations(value as Record<string, unknown>);
    } else if (value.trim() === "") {
      continue;
    }
    if (key === "__proto__") {
      Object.defineProperty(result, key, { value: translation, enumerable: true, writable: true, configurable: true });
    } else {
      result[key] = translation;
    }
  }
  return result;
};
