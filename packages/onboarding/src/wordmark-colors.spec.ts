import { describe, expect, it } from "vitest";

import { recolorWordmark } from "./wordmark-colors";

describe("recolorWordmark", () => {
  it("recolors red fills while preserving white details", () => {
    const svg = '<path fill="#FA5252"/><path fill="#FDD7D7"/><path fill="#FEFDFD"/>';

    expect(recolorWordmark(svg, "#228BE6", "#15AABF", "#1A1B1E")).toBe(
      '<path fill="#228BE6"/><path fill="#15AABF"/><path fill="#1A1B1E"/>',
    );
  });

  it("leaves the source unchanged for incomplete colors", () => {
    const svg = '<path fill="#FA5252"/>';
    expect(recolorWordmark(svg, "#228BE6", "")).toBe(svg);
  });
});
