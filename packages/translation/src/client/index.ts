"use client";

import { useTranslations } from "next-intl";

export { useChangeLocale } from "./use-change-locale";
export { useCurrentLocale } from "./use-current-locale";

export const { useI18n, useScopedI18n } = {
  useI18n: useTranslations,
  useScopedI18n: useTranslations,
};
