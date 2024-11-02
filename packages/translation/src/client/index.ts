"use client";

import { useMessages, useTranslations } from "next-intl";

import type { TranslationObject } from "../type";

export { useChangeLocale } from "./use-change-locale";
export { useCurrentLocale } from "./use-current-locale";

export const { useI18n, useScopedI18n } = {
  useI18n: useTranslations,
  useScopedI18n: useTranslations,
};

export const { useI18nMessages } = {
  useI18nMessages: () => useMessages() as TranslationObject,
};

export { useTranslations };
