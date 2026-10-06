"use client";

import { useMessages, useTranslations } from "next-intl";

import type { SupportedLanguage } from "../config";
import type englishTranslation from "../lang/en.json";

export { useChangeLocale } from "./use-change-locale";
export { useCurrentIntlLocale, useCurrentLocale } from "./use-current-locale";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof englishTranslation;
    Locale: SupportedLanguage;
  }
}

// Keep these as direct exports so Turbopack and webpack can statically inspect
// the client package's public surface.
export const useI18n = useTranslations;
export const useI18nMessages = () => useMessages();
