"use client";

import { createI18nClient } from "next-international/client";

import { languageMapping } from "./lang";
import en from "./lang/en";

export const { useI18n, useScopedI18n, I18nProviderClient } = createI18nClient(
  languageMapping(),
  {
    fallbackLocale: en,
  },
);
