import { supportedLanguages } from ".";

const enTranslations = () => import("./lang/en");

export const languageMapping = () => {
  const mapping: Record<string, unknown> = {};

  for (const language of supportedLanguages) {
    mapping[language] = () => import(`./lang/${language}`) as ReturnType<typeof enTranslations>;
  }

  return mapping as Record<(typeof supportedLanguages)[number], () => ReturnType<typeof enTranslations>>;
};
