import deepmerge from "deepmerge";
import { getRequestConfig } from "next-intl/server";

import type { TranslationObject } from ".";
import { fallbackLocale, isLocaleSupported } from ".";
import type { SupportedLanguage } from "./config";
import { createLanguageMapping } from "./mapping";

// ponytail: module-level memo — one merged object per locale used (~250-400 KB each).
// Ceiling: ~2 MB for 5 active locales. Upgrade: evict when size > 8.
const mergedMessages = new Map<SupportedLanguage, Promise<TranslationObject>>();

const loadMessagesAsync = (locale: SupportedLanguage): Promise<TranslationObject> => {
  const existing = mergedMessages.get(locale);
  if (existing) return existing;

  const promise = (async () => {
    const languageMap = createLanguageMapping();
    const current = removeEmptyTranslations((await languageMap[locale]()).default) as TranslationObject;
    if (locale === fallbackLocale) return current;
    const fallback = (await languageMap[fallbackLocale]()).default;
    return deepmerge(fallback, current) as TranslationObject;
  })();

  mergedMessages.set(locale, promise);
  void promise.catch(() => {
    if (mergedMessages.get(locale) === promise) mergedMessages.delete(locale);
  });
  return promise;
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: SupportedLanguage =
    requested && isLocaleSupported(requested) ? (requested as SupportedLanguage) : fallbackLocale;
  return { locale, messages: await loadMessagesAsync(locale) };
});

const removeEmptyTranslations = (translations: Record<string, unknown>): Record<string, unknown> => {
  return Object.entries(translations).reduce(
    (acc, [key, value]) => {
      if (typeof value !== "string") {
        return { ...acc, [key]: removeEmptyTranslations(value as Record<string, unknown>) };
      }
      if (value.trim() === "") {
        return acc;
      }
      return { ...acc, [key]: value };
    },
    {} as Record<string, unknown>,
  );
};
