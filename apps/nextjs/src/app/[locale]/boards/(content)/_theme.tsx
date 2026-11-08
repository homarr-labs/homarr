"use client";

import type { PropsWithChildren } from "react";
import { colorsTuple, createTheme, MantineProvider, rem } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";
import type { ColorScheme } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import { createThemeVariablesResolver } from "@homarr/ui/themes";

import { useColorSchemeManager } from "../../_client-providers/mantine";
import { createDefaultAccentColors, generateColorScale, resolveActiveTheme } from "~/theme/branding";
import { previewColorSchemeManager, useThemePreview } from "~/components/theme/theme-preview-context";

export const BoardMantineProvider = ({
  children,
  defaultColorScheme,
}: PropsWithChildren<{ defaultColorScheme: ColorScheme }>) => {
  const board = useRequiredBoard();
  const settings = useSettings();
  const preview = useThemePreview();
  const { branding, themeId, customTheme } = preview ?? settings;
  const activeTheme = resolveActiveTheme(branding, { themeId, customTheme });
  const custom = activeTheme.customTheme;
  const colorSchemeManager = useColorSchemeManager();
  const primaryColor = branding.lockPrimaryColor ? branding.primaryColor : board.primaryColor;

  const theme = createTheme({
    colors: {
      ...(activeTheme.preset === "default" &&
        createDefaultAccentColors(
          {
            primaryColor,
            secondaryColor: board.secondaryColor,
            lockPrimaryColor: branding.lockPrimaryColor,
          },
          custom,
        )),
      iconColor:
        custom?.theme.colors?.iconColor ??
        (board.iconColor ? generateColorScale(board.iconColor) : colorsTuple("#000000")),
    },
    fontSizes: {
      "2xl": rem(24),
      "3xl": rem(28),
      "4xl": rem(36),
      ...custom?.theme.fontSizes,
    },
  });

  return (
    <MantineProvider
      defaultColorScheme={defaultColorScheme}
      theme={theme}
      colorSchemeManager={preview ? previewColorSchemeManager : colorSchemeManager}
      forceColorScheme={preview?.scheme}
      cssVariablesResolver={createThemeVariablesResolver(
        activeTheme.preset,
        activeTheme.lockedPrimaryColor,
        activeTheme.customTheme,
      )}
    >
      {children}
    </MantineProvider>
  );
};
