import { describe, expect, test } from "vitest";

import { pwaManifestChromeColor, pwaPageBackground, pwaViewportThemeColor } from "./pwa-chrome";

const brandingPrimary = "#fa5252";

describe("pwa chrome colours", () => {
  test("viewport emits the page background for light and dark, not the branding primary", () => {
    expect(pwaViewportThemeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: pwaPageBackground.light },
      { media: "(prefers-color-scheme: dark)", color: pwaPageBackground.dark },
    ]);
    expect(pwaViewportThemeColor.map((entry) => entry.color)).not.toContain(brandingPrimary);
    expect(pwaViewportThemeColor.map((entry) => entry.color)).not.toContain("#fff");
  });

  test("manifest chrome follows the instance default colour scheme background", () => {
    expect(pwaManifestChromeColor("light")).toBe(pwaPageBackground.light);
    expect(pwaManifestChromeColor("auto")).toBe(pwaPageBackground.light);
    expect(pwaManifestChromeColor("dark")).toBe(pwaPageBackground.dark);
    expect(pwaManifestChromeColor("light")).not.toBe("#fff");
    expect(pwaManifestChromeColor("dark")).not.toBe("#fff");
    expect(pwaManifestChromeColor("dark")).not.toBe(brandingPrimary);
  });
});
