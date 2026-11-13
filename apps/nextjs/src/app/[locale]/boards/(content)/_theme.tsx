"use client";

import type { PropsWithChildren } from "react";
import { colorsTuple, createTheme, MantineProvider, rem, useMantineTheme } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";
import type { ColorScheme } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";

import { useColorSchemeManager } from "../../_client-providers/mantine";
import { createAppearanceTheme, generateColorScale, resolveActiveTheme } from "~/theme/branding";
import { previewColorSchemeManager, useThemePreview } from "~/components/theme/theme-preview-context";

export const BoardMantineProvider = ({
  children,
  defaultColorScheme,
}: PropsWithChildren<{ defaultColorScheme: ColorScheme }>) => {
  const board = useRequiredBoard();
  const settings = useSettings();
  const preview = useThemePreview();
  const parentTheme = useMantineTheme();
  const branding = preview?.branding ?? settings.branding;
  const active = resolveActiveTheme(branding, preview ?? undefined);
  const document = structuredClone(active.document);
  for (const key of ["primary", "secondary"] as const) {
    const color = board[`${key}Color`];
    if (!color) continue;
    for (const scheme of ["light", "dark"] as const) document[scheme] = { ...document[scheme], [key]: color };
    if (document.theme.colors) {
      delete document.theme.colors[`${key}Color`];
      delete document.theme.colors[`preset${key.charAt(0).toUpperCase()}${key.slice(1)}Light`];
      delete document.theme.colors[`preset${key.charAt(0).toUpperCase()}${key.slice(1)}Dark`];
    }
    if (key === "primary") document.theme.primaryColor = "primaryColor";
  }
  const appearance = createAppearanceTheme(branding, { themeId: "custom", customTheme: document });
  const colorSchemeManager = useColorSchemeManager();
  let defaultRadius = rem(parentTheme.defaultRadius);
  if (typeof parentTheme.defaultRadius === "string")
    defaultRadius = parentTheme.radius[parentTheme.defaultRadius] ?? parentTheme.defaultRadius;
  const theme = createTheme({
    ...appearance.theme,
    colors: {
      ...appearance.theme.colors,
      iconColor:
        document.theme.colors?.iconColor ??
        (board.iconColor ? generateColorScale(board.iconColor) : colorsTuple("#000000")),
    },
    radius: { ...appearance.theme.radius, default: String(defaultRadius) },
    fontSizes: { "2xl": rem(24), "3xl": rem(28), "4xl": rem(36), ...appearance.theme.fontSizes },
  });
  return (
    <MantineProvider
      defaultColorScheme={defaultColorScheme}
      theme={theme}
      colorSchemeManager={preview ? previewColorSchemeManager : colorSchemeManager}
      forceColorScheme={preview?.scheme}
      cssVariablesResolver={appearance.cssVariablesResolver}
    >
      {children}
    </MantineProvider>
  );
};
