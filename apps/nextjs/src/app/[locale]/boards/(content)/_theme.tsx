"use client";

import type { PropsWithChildren } from "react";
import { colorsTuple, createTheme, MantineProvider, rem, v8CssVariablesResolver } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";
import type { ColorScheme } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";

import { useColorSchemeManager } from "../../_client-providers/mantine";
import { generateColorScale } from "~/theme/branding";

export const BoardMantineProvider = ({
  children,
  defaultColorScheme,
}: PropsWithChildren<{ defaultColorScheme: ColorScheme }>) => {
  const board = useRequiredBoard();
  const { branding } = useSettings();
  const colorSchemeManager = useColorSchemeManager();
  const primaryColor = branding.lockPrimaryColor ? branding.primaryColor : board.primaryColor;

  const theme = createTheme({
    colors: {
      primaryColor: generateColorScale(primaryColor),
      secondaryColor: generateColorScale(board.secondaryColor),
      iconColor: board.iconColor ? generateColorScale(board.iconColor) : colorsTuple("#000000"),
    },
    primaryColor: "primaryColor",
    autoContrast: true,
    defaultRadius: branding.defaultRadius,
    fontSizes: {
      "2xl": rem(24),
      "3xl": rem(28),
      "4xl": rem(36),
    },
  });

  return (
    <MantineProvider
      defaultColorScheme={defaultColorScheme}
      theme={theme}
      colorSchemeManager={colorSchemeManager}
      cssVariablesResolver={v8CssVariablesResolver}
    >
      {children}
    </MantineProvider>
  );
};
