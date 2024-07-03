import { supportedLanguages } from ".";

const enTranslations = () => import("./lang/en");

export const languageMapping = () => {
  const mapping: Record<string, unknown> = {};

  for (const language of supportedLanguages) {
    mapping[language] = () => import(`./lang/${language}`) as ReturnType<typeof enTranslations>;
  }

  return mapping as Record<(typeof supportedLanguages)[number], () => ReturnType<typeof enTranslations>>;
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKeys = NestedKeyOf<typeof enTranslations>;
