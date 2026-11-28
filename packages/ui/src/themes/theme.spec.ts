import { describe, expect, test } from "vitest";

import { isThemeId, themeIds } from "@homarr/definitions";
import { themeSelectionSchema } from "@homarr/validation/theme";

import { createThemeColorScale, getThemePalette } from ".";
import { getThemePreset, themePresets } from "./registry";

describe("theme presets", () => {
  test("accepts published IDs and rejects unknown selections", () => {
    for (const id of themeIds) {
      expect(isThemeId(id)).toBe(true);
      expect(themeSelectionSchema.safeParse(id).success).toBe(true);
    }
    expect(themeSelectionSchema.safeParse("custom").success).toBe(true);
    for (const value of ["", "unknown-theme", "Nord", null, 123]) {
      expect(isThemeId(value)).toBe(false);
      expect(themeSelectionSchema.safeParse(value).success).toBe(false);
    }
  });

  test("provides both palettes for every selectable preset", () => {
    const presets = themeIds.filter((id) => id !== "default");
    expect(Object.keys(themePresets).toSorted()).toEqual([...presets].toSorted());
    expect(getThemePreset("default")).toBeUndefined();
    for (const id of presets) {
      const preset = getThemePreset(id);
      if (!preset) throw new Error(`Missing preset: ${id}`);
      for (const scheme of ["light", "dark"] as const) {
        expect(Object.keys(preset[scheme]).toSorted()).toEqual(
          ["body", "surface", "hover", "border", "text", "dimmed", "primary", "secondary"].toSorted(),
        );
        for (const color of Object.values(preset[scheme])) expect(color).toMatch(/^#[\da-f]{6}$/iu);
      }
    }
    expect(getThemePalette("nord", "dark")).toMatchObject({ body: "#2e3440", primary: "#88c0d0" });
  });

  test("keeps the chosen accent at the requested primary shade", () => {
    for (const shade of [4, 6, 8]) {
      const scale = createThemeColorScale("#88c0d0", shade);
      expect(scale).toHaveLength(10);
      expect(scale[shade]).toBe("#88c0d0");
      expect(new Set(scale).size).toBeGreaterThan(1);
    }
  });
});
