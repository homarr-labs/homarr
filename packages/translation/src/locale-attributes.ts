import type { SupportedLanguage } from ".";

export const localeAttributes: Record<
  SupportedLanguage,
  {
    name: string;
    translatedName: string;
    flagIcon: string;
  }
> = {
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
};

localeAttributes;
