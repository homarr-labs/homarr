import type { stringOrTranslation, TranslationFunction } from "./type";

export * from "./type";
export * from "./locale-attributes";

export const supportedLanguages = ["en", "de"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const defaultLocale = "en";
export { languageMapping } from "./lang";

export const translateIfNecessary = (
  t: TranslationFunction,
  value: stringOrTranslation | undefined,
) => {
  if (typeof value === "function") {
    return value(t);
  }
  return value;
};
