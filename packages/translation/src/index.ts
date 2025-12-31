import type { SupportedLanguage } from "./config";
import { supportedLanguages } from "./config";
import type { stringOrTranslation, TranslationFunction } from "./type";

export * from "./config";
export type { TranslationKeys } from "./mapping";
export { createLanguageMapping } from "./mapping";
export * from "./type";

export const translateIfNecessary = (t: TranslationFunction, value: stringOrTranslation | undefined) => {
  if (typeof value === "function") {
    return value(t);
  }
  return value;
};

export const isLocaleSupported = (locale: string): locale is SupportedLanguage => {
  return supportedLanguages.includes(locale as SupportedLanguage);
};
