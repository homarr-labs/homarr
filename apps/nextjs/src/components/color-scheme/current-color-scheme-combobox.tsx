"use client";

import { useMantineColorScheme } from "@mantine/core";

import type { ColorScheme } from "@homarr/definitions";

import { ColorSchemeCombobox } from "./color-scheme-combobox";

interface CurrentColorSchemeComboboxProps {
  w?: string;
}

export const CurrentColorSchemeCombobox = ({ w }: CurrentColorSchemeComboboxProps) => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return <ColorSchemeCombobox value={colorScheme as ColorScheme} onChange={setColorScheme} width={w} />;
};
