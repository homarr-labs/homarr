"use client";

import type { PropsWithChildren } from "react";
import { generateColors } from "@mantine/colors-generator";

import type { MantineColorShade } from "@homarr/ui";
import { createTheme, MantineProvider } from "@homarr/ui";

import { useRequiredBoard } from "./_context";

export const BoardMantineProvider = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();

  const theme = createTheme({
    colors: {
      primaryColor: generateColors(board.primaryColor), // TODO: add fallbacks
      secondaryColor: generateColors(board.secondaryColor),
    },
    primaryColor: "primaryColor",
    primaryShade: board.primaryShade as MantineColorShade,
    autoContrast: true,
  });

  return <MantineProvider theme={theme}>{children}</MantineProvider>;
};
