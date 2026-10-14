import type { useCurrentLocale, useI18n } from "../client";
import type {
  ScopedTranslationFunction as LegacyScopedTranslationFunction,
  TranslationFunction as LegacyTranslationFunction,
} from "../type";
import type { SupportedLanguage } from "../languages";

import type { ScopedTranslationFunction, TranslationFunction, TranslationKeys, TranslationNamespace } from "./types";

type Assert<Value extends true> = Value;
export type KnownKey = Assert<"widget.common.app.description" extends TranslationKeys ? true : false>;
export type UnknownKey = Assert<"unknown.fixture.key" extends TranslationKeys ? false : true>;
export type KnownNamespace = Assert<"widget.common.app" extends TranslationNamespace ? true : false>;
export type UnknownNamespace = Assert<"unknown.fixture.namespace" extends TranslationNamespace ? false : true>;
export type RootHookCompatibility = Assert<
  ReturnType<typeof useI18n<never>> extends TranslationFunction ? true : false
>;
export type LegacyRootCompatibility = Assert<TranslationFunction extends LegacyTranslationFunction ? true : false>;
export type LegacyScopedCompatibility = Assert<
  ScopedTranslationFunction<"widget.common.app"> extends LegacyScopedTranslationFunction<"widget.common.app">
    ? true
    : false
>;
export type LocaleCompatibility = Assert<ReturnType<typeof useCurrentLocale> extends SupportedLanguage ? true : false>;
