import type { createTranslator, IntlConfig, MessageKeys, NamespaceKeys, NestedKeyOf } from "use-intl";

import type englishTranslation from "../lang/en.json";
import type { SupportedLanguage } from "../languages";

declare module "use-intl" {
  interface AppConfig {
    Messages: typeof englishTranslation;
    Locale: SupportedLanguage;
  }
}

export type TranslationObject = typeof englishTranslation;
export type TranslationKeys = MessageKeys<TranslationObject, NestedKeyOf<TranslationObject>>;
export type TranslationNamespace = NamespaceKeys<TranslationObject, NestedKeyOf<TranslationObject>>;
export type ScopedTranslationFunction<Namespace extends TranslationNamespace = never> = ReturnType<
  typeof createTranslator<TranslationObject, Namespace>
>;
export type TranslationFunction = ScopedTranslationFunction;
export type stringOrTranslation = string | ((t: TranslationFunction) => string);
export type TranslationSnapshot = Readonly<Pick<IntlConfig, "locale" | "now" | "timeZone" | "formats">> & {
  readonly messages: TranslationObject;
};
export type I18nErrorHandlers = Pick<IntlConfig, "onError" | "getMessageFallback">;
export type RequestI18nOptions = Omit<TranslationSnapshot, "messages" | "locale"> &
  I18nErrorHandlers & {
    readonly locale?: string;
  };

export const translateIfNecessary = (t: TranslationFunction, value: stringOrTranslation | undefined) =>
  typeof value === "function" ? value(t) : value;
