"use client";

import type { PropsWithChildren } from "react";
import type { MantineColorsTuple } from "@mantine/core";
import { createTheme, darken, lighten, MantineProvider } from "@mantine/core";

import { useRequiredBoard } from "./_context";

export const BoardMantineProvider = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();

  const theme = createTheme({
    colors: {
      primaryColor: generateColors(board.primaryColor),
      secondaryColor: generateColors(board.secondaryColor),
    },
    primaryColor: "primaryColor",
    autoContrast: true,
  });

  return <MantineProvider theme={theme}>{children}</MantineProvider>;
};

export const generateColors = (hex: string) => {
  const lightnessForColors = [
    -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2,
  ] as const;
  const rgbaColors = lightnessForColors.map((lightness) => {
    if (lightness < 0) {
      return lighten(hex, -lightness);
    }
    return darken(hex, lightness);
  });

  return rgbaColors.map((color) => {
    return (
      "#" +
      color
        .split("(")[1]!
        .replaceAll(" ", "")
        .replace(")", "")
        .split(",")
        .map((color) => parseInt(color, 10))
        .slice(0, 3)
        .map((color) => color.toString(16).padStart(2, "0"))
        .join("")
    );
  }) as unknown as MantineColorsTuple;
};
