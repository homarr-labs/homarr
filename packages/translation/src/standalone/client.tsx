"use client";

import { createContext, useContext, useTransition } from "react";
import type { ReactNode } from "react";
import { IntlProvider, useLocale, useMessages, useTranslations } from "use-intl/react";

import { getIntlLocale } from "../config";
import type { SupportedLanguage } from "../languages";

import type { I18nErrorHandlers, TranslationSnapshot } from "./types";

export type LocaleChange = (locale: SupportedLanguage) => void | Promise<void>;
export type I18nProviderProps = I18nErrorHandlers & {
  snapshot: TranslationSnapshot;
  children: ReactNode;
  onChangeLocale?: LocaleChange;
};

const LocaleChangeContext = createContext<LocaleChange | undefined>(undefined);

export function I18nProvider({ snapshot, children, onChangeLocale, ...handlers }: I18nProviderProps) {
  return (
    <IntlProvider {...snapshot} {...handlers}>
      <LocaleChangeContext.Provider value={onChangeLocale}>{children}</LocaleChangeContext.Provider>
    </IntlProvider>
  );
}

export const useI18n = useTranslations;
export const useI18nMessages = () => useMessages();
export const useCurrentLocale = useLocale;
export const useCurrentIntlLocale = () => getIntlLocale(useLocale());

export function useChangeLocale() {
  const currentLocale = useLocale();
  const onChangeLocale = useContext(LocaleChangeContext);
  const [isPending, startTransition] = useTransition();
  return {
    changeLocale(newLocale: SupportedLanguage) {
      if (newLocale === currentLocale) return;
      if (!onChangeLocale) throw new Error("Locale switching requires an explicit host adapter");
      startTransition(() => onChangeLocale(newLocale));
    },
    isPending,
  };
}

export { IntlProvider, useFormatter, useNow, useTimeZone } from "use-intl/react";
