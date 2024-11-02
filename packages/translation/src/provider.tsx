"use client";

import { createContext } from "react";
import type { PropsWithChildren } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { MRT_Localization } from "mantine-react-table";

import type { SupportedLanguage } from "./config";
import { localeConfigurations } from "./config";

interface LocalizationContextProps {
  mantineReactTable: MRT_Localization;
}

const LocalizationContext = createContext<LocalizationContextProps | null>(null);

export const LocalizationProvider = ({
  children,
  locale,
  mantineReactTable,
}: PropsWithChildren<LocalizationContextProps & { locale: SupportedLanguage }>) => {
  const { data: dayJsLocale } = useSuspenseQuery({
    queryKey: ["dayjs-locale", locale],
    // eslint-disable-next-line no-restricted-syntax
    queryFn: async () => {
      return await localeConfigurations[locale].importDayJsLocale();
    },
  });
  dayjs.locale(dayJsLocale);

  return <LocalizationContext.Provider value={{ mantineReactTable }}>{children}</LocalizationContext.Provider>;
};
