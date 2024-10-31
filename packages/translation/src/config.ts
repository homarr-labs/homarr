import { objectKeys } from "@homarr/common";

export const localeConfigurations = {
  cn: {
    name: "中文",
    translatedName: "Chinese (Simplified)",
    flagIcon: "cn",
  },
  cs: {
    name: "Čeština",
    translatedName: "Czech",
    flagIcon: "cz",
  },
  da: {
    name: "Dansk",
    translatedName: "Danish",
    flagIcon: "dk",
  },
  de: {
    name: "Deutsch",
    translatedName: "German",
    flagIcon: "de",
  },
  en: {
    name: "English",
    translatedName: "English",
    flagIcon: "us",
  },
  el: {
    name: "Ελληνικά",
    translatedName: "Greek",
    flagIcon: "gr",
  },
  es: {
    name: "Español",
    translatedName: "Spanish",
    flagIcon: "es",
  },
  et: {
    name: "Eesti",
    translatedName: "Estonian",
    flagIcon: "ee",
  },
  fr: {
    name: "Français",
    translatedName: "French",
    flagIcon: "fr",
  },
  he: {
    name: "עברית",
    translatedName: "Hebrew",
    flagIcon: "il",
  },
  hr: {
    name: "Hrvatski",
    translatedName: "Croatian",
    flagIcon: "hr",
  },
  hu: {
    name: "Magyar",
    translatedName: "Hungarian",
    flagIcon: "hu",
  },
  it: {
    name: "Italiano",
    translatedName: "Italian",
    flagIcon: "it",
  },
  ja: {
    name: "日本語",
    translatedName: "Japanese",
    flagIcon: "jp",
  },
  ko: {
    name: "한국어",
    translatedName: "Korean",
    flagIcon: "kr",
  },
  lt: {
    name: "Lietuvių",
    translatedName: "Lithuanian",
    flagIcon: "lt",
  },
  lv: {
    name: "Latviešu",
    translatedName: "Latvian",
    flagIcon: "lv",
  },
  nl: {
    name: "Nederlands",
    translatedName: "Dutch",
    flagIcon: "nl",
  },
  no: {
    name: "Norsk",
    translatedName: "Norwegian",
    flagIcon: "no",
  },
  pl: {
    name: "Polski",
    translatedName: "Polish",
    flagIcon: "pl",
  },
  pt: {
    name: "Português",
    translatedName: "Portuguese",
    flagIcon: "pt",
  },
  ro: {
    name: "Românesc",
    translatedName: "Romanian",
    flagIcon: "ro",
  },
  ru: {
    name: "Русский",
    translatedName: "Russian",
    flagIcon: "ru",
  },
  sk: {
    name: "Slovenčina",
    translatedName: "Slovak",
    flagIcon: "sk",
  },
  sl: {
    name: "Slovenščina",
    translatedName: "Slovenian",
    flagIcon: "si",
  },
  sv: {
    name: "Svenska",
    translatedName: "Swedish",
    flagIcon: "se",
  },
  tr: {
    name: "Türkçe",
    translatedName: "Turkish",
    flagIcon: "tr",
  },
  tw: {
    name: "中文",
    translatedName: "Chinese (Traditional)",
    flagIcon: "tw",
  },
  uk: {
    name: "Українська",
    translatedName: "Ukrainian",
    flagIcon: "ua",
  },
  vi: {
    name: "Tiếng Việt",
    translatedName: "Vietnamese",
    flagIcon: "vn",
  },
} satisfies Record<
  string,
  {
    name: string;
    translatedName: string;
    flagIcon: string;
  }
>;

export const supportedLanguages = objectKeys(localeConfigurations);
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const defaultLocale = "en" satisfies SupportedLanguage;
