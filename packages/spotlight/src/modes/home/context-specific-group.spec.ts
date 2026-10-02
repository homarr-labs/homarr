import { describe, expect, test } from "vitest";

import type { ContextSpecificItem } from "./context";
import { shouldShowContextSpecificResult } from "./context-specific-group";

const item = (overrides: Partial<ContextSpecificItem> = {}): ContextSpecificItem => ({
  id: "result",
  name: "Matching result",
  icon: "/icon.png",
  interaction: () => ({ type: "none" }),
  ...overrides,
});

describe("contextSpecificSearchGroups", () => {
  test("keeps an always-visible fallback in every default search", () => {
    expect(shouldShowContextSpecificResult("unrelated query", item({ alwaysVisible: true }))).toBe(true);
    expect(shouldShowContextSpecificResult("", item({ alwaysVisible: true }))).toBe(true);
  });

  test("shows ordinary local results only when their names match", () => {
    expect(shouldShowContextSpecificResult("matching", item())).toBe(true);
    expect(shouldShowContextSpecificResult("unrelated query", item())).toBe(false);
    expect(shouldShowContextSpecificResult("", item())).toBe(false);
  });
});
