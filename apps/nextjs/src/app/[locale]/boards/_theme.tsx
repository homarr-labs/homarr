"use client";

import type { PropsWithChildren } from "react";
import { generateColors } from "@mantine/colors-generator";

import type { MantineColorShade } from "@homarr/ui";
import { MantineProvider } from "@homarr/ui";

import { useRequiredBoard } from "./_context";

export const BoardMantineProvider = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();

  console.log("board", board);

  return (
    <MantineProvider
      theme={{
        colors: {
          primary: generateColors(board.primaryColor),
          secondary: generateColors(board.secondaryColor),
        },
        primaryColor: "primary",
        primaryShade: board.primaryShade as MantineColorShade,
      }}
    >
      {children}
    </MantineProvider>
  );
};
