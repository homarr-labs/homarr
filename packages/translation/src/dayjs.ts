import { use } from "react";
import { useParams } from "next/navigation";
import dayjs from "dayjs";

import type { SupportedLanguage } from "./config";
import { localeConfigurations } from "./config";

const locales = new Map<SupportedLanguage, Promise<string>>();

const loadDayJsLocale = (locale: SupportedLanguage) => {
  const cached = locales.get(locale);
  if (cached) return cached;

  const promise = localeConfigurations[locale]
    .importDayJsLocale()
    .then((dayJsLocale) => dayJsLocale.name)
    .catch(() => "en");

  locales.set(locale, promise);
  return promise;
};

export const useSuspenseDayJsLocalization = () => {
  const { locale } = useParams<{ locale: SupportedLanguage }>();
  const dayJsLocale = use(loadDayJsLocale(locale));

  dayjs.locale(dayJsLocale);
  return dayJsLocale;
};
