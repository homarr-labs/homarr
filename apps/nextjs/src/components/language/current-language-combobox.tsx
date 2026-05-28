"use client";

import { useChangeLocale, useCurrentLocale } from "@homarr/translation/client";

import { LanguageCombobox } from "./language-combobox";

interface CurrentLanguageComboboxProps {
  width?: string;
  showTranslatedName?: boolean;
}

export const CurrentLanguageCombobox = ({ width, showTranslatedName }: CurrentLanguageComboboxProps) => {
  const currentLocale = useCurrentLocale();
  const { changeLocale, isPending } = useChangeLocale();

  return (
    <LanguageCombobox
      showTranslatedName={showTranslatedName}
      value={currentLocale}
      onChange={changeLocale}
      isPending={isPending}
      width={width}
    />
  );
};
