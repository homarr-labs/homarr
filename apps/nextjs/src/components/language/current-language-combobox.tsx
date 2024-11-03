"use client";

import type { InputBaseProps } from "@mantine/core";

import { useChangeLocale, useCurrentLocale } from "@homarr/translation/client";

import { LanguageCombobox } from "./language-combobox";

export const CurrentLanguageCombobox = ({ variant }: Pick<InputBaseProps, "variant">) => {
  const currentLocale = useCurrentLocale();
  const { changeLocale, isPending } = useChangeLocale();

  return <LanguageCombobox value={currentLocale} onChange={changeLocale} isPending={isPending} variant={variant} />;
};
