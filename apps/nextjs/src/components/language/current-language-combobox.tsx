"use client";

import { useChangeLocale, useCurrentLocale } from "@homarr/translation/client";

import { LanguageCombobox } from "./language-combobox";

export const CurrentLanguageCombobox = () => {
  const currentLocale = useCurrentLocale();
  const { changeLocale, isPending } = useChangeLocale();

  return <LanguageCombobox value={currentLocale} onChange={changeLocale} isPending={isPending} />;
};
