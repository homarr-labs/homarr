import type { useI18n, useScopedI18n } from "./client";
import type enTranslation from "./lang/en";

export type TranslationFunction = ReturnType<typeof useI18n>;
export type ScopedTranslationFunction<T extends Parameters<typeof useScopedI18n>[0]> = ReturnType<typeof useScopedI18n<T>>;
export type TranslationObject = typeof enTranslation;
export type stringOrTranslation = string | ((t: TranslationFunction) => string);
