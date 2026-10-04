import type { MantineColorsTuple, MantineThemeOverride } from "@mantine/core";
import { createTheme, darken, lighten, mergeThemeOverrides } from "@mantine/core";

import type { ServerSettings } from "@homarr/server-settings";
import { theme as homarrTheme } from "@homarr/ui";

export const generateColorScale = (hex: string) => {
  const lightnessSteps = [-0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2] as const;
  const colors = lightnessSteps.map((lightness) => {
    if (lightness < 0) return lighten(hex, -lightness);
    return darken(hex, lightness);
  });

  return colors.map((color) => {
    const channels = color.split("(")[1]?.replaceAll(" ", "").replace(")", "").split(",");
    if (!channels) return hex;
    const value = channels
      .map((channel) => parseInt(channel, 10))
      .slice(0, 3)
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("");
    return `#${value}`;
  }) as unknown as MantineColorsTuple;
};

export const createBrandTheme = (branding: ServerSettings["branding"]): MantineThemeOverride =>
  mergeThemeOverrides(
    homarrTheme,
    createTheme({
      colors: {
        primaryColor: generateColorScale(branding.primaryColor),
        secondaryColor: generateColorScale(branding.secondaryColor),
      },
      primaryColor: "primaryColor",
      defaultRadius: branding.defaultRadius,
      components: {
        ActionIcon: { defaultProps: { radius: branding.defaultRadius } },
        Button: { defaultProps: { radius: branding.defaultRadius } },
        Card: { defaultProps: { radius: branding.defaultRadius } },
        Paper: { defaultProps: { radius: branding.defaultRadius } },
      },
    }),
  );
