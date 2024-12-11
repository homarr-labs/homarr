"use client";

import { useChangeLocale, useCurrentLocale } from "@homarr/translation/client";

import { LanguageCombobox } from "./language-combobox";

interface CurrentLanguageComboboxProps {
  w?: string;
}

export const CurrentLanguageCombobox = ({ w }: CurrentLanguageComboboxProps) => {
  const currentLocale = useCurrentLocale();
  const { changeLocale, isPending } = useChangeLocale();

  return <LanguageCombobox value={currentLocale} onChange={changeLocale} isPending={isPending} w={w} />;
};
