import type { useI18n } from "./client";
import type enTranslation from "./lang/en";

export type TranslationFunction = ReturnType<typeof useI18n>;
export type TranslationObject = typeof enTranslation;
export type stringOrTranslation = string | ((t: TranslationFunction) => string);
