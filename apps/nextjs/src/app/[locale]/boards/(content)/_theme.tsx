"use client";

import type { PropsWithChildren } from "react";
import { colorsTuple, createTheme, MantineProvider, rem } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";
import type { ColorScheme } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import { createThemeVariablesResolver } from "@homarr/ui/themes";

import { useColorSchemeManager } from "../../_client-providers/mantine";
import { generateColorScale } from "~/theme/branding";

export const BoardMantineProvider = ({
  children,
  defaultColorScheme,
}: PropsWithChildren<{ defaultColorScheme: ColorScheme }>) => {
  const board = useRequiredBoard();
  const { branding, themeId: userThemeId } = useSettings();
  const themeId = userThemeId ?? branding.themeId;
  const colorSchemeManager = useColorSchemeManager();
  const primaryColor = branding.lockPrimaryColor ? branding.primaryColor : board.primaryColor;

  const theme = createTheme({
    colors: {
      ...(themeId === "default" && {
        primaryColor: generateColorScale(primaryColor),
        secondaryColor: generateColorScale(board.secondaryColor),
      }),
      iconColor: board.iconColor ? generateColorScale(board.iconColor) : colorsTuple("#000000"),
    },
    primaryColor: "primaryColor",
    autoContrast: true,
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
      cssVariablesResolver={createThemeVariablesResolver(
        themeId,
        branding.lockPrimaryColor ? branding.primaryColor : undefined,
      )}
    >
      {children}
    </MantineProvider>
  );
};
