"use client";

import { ColorInput, useMantineTheme } from "@mantine/core";
import type { ColorInputProps } from "@mantine/core";

interface BoardColorInputProps extends ColorInputProps {
  defaultColor?: string;
}

export const BoardColorInput = ({ defaultColor, ...props }: BoardColorInputProps) => {
  const theme = useMantineTheme();
  const themeSwatches = Object.values(theme.colors).map((color) => color[6]);
  const swatches = defaultColor
    ? [defaultColor, ...themeSwatches.filter((color) => color.toLowerCase() !== defaultColor.toLowerCase())]
    : themeSwatches;

  return <ColorInput {...props} format="hex" swatches={swatches} />;
};
