/**
 * Keep the locale list dependency-free. This module is used by Next's proxy,
 * where importing the full translation barrel would widen every route graph.
 */
export const supportedLanguages = [
  "ca",
  "cn",
  "cr",
  "cs",
  "da",
  "de",
  "de-CH",
  "en-gb",
  "en",
  "el",
  "es",
  "et",
  "fi",
  "fr",
  "he",
  "hr",
  "hu",
  "it",
  "ja",
  "ko",
  "lt",
  "lv",
  "nl",
  "no",
  "pl",
  "pt",
  "pt-br",
  "ro",
  "ru",
  "sk",
  "sl",
  "sv",
  "tr",
  "zh",
  "uk",
  "vi",
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const fallbackLocale = "en" satisfies SupportedLanguage;
