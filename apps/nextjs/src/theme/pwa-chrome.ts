import type { ColorScheme } from "@homarr/definitions";

/**
 * Page backgrounds painted before the theme loads.
 * Keep in sync with apps/nextjs/src/styles/color-scheme.scss.
 * Custom appearance themes are intentionally ignored: PWA chrome follows the colour scheme only.
 */
export const pwaPageBackground = {
  // Off-white, not #fff: the light page and PWA chrome should not glare.
  light: "#f8f9fa",
  dark: "#242424",
} as const;

export const pwaViewportThemeColor = [
  { media: "(prefers-color-scheme: light)", color: pwaPageBackground.light },
  { media: "(prefers-color-scheme: dark)", color: pwaPageBackground.dark },
] as const;

/** Static manifest colour. Auto uses the light page background, matching the CSS default before the media query. */
export const pwaManifestChromeColor = (defaultColorScheme: ColorScheme) =>
  defaultColorScheme === "dark" ? pwaPageBackground.dark : pwaPageBackground.light;
