"use client";

import { ColorInput, useMantineTheme } from "@mantine/core";
import type { ColorInputProps } from "@mantine/core";

export const BoardColorInput = (props: ColorInputProps) => {
  const theme = useMantineTheme();

  return <ColorInput {...props} format="hex" swatches={Object.values(theme.colors).map((color) => color[6])} />;
};
