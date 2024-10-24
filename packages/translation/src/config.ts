import { objectKeys } from "@homarr/common";

export const localeConfigurations = {
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
