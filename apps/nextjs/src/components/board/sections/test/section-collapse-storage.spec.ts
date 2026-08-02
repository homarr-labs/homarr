import { describe, expect, test } from "vitest";

import {
  readSectionCollapsedFromStorage,
  sectionCollapseStorageKey,
  writeSectionCollapsedToStorage,
} from "../section-collapse-storage";

describe("section collapse storage", () => {
  test.each([
    ["true", false],
    ["false", true],
  ])("inverts a legacy open value of %s exactly once", (legacyValue, expectedCollapsed) => {
    const sectionId = "media";
    const legacyKey = `homarr-section-collapsed-${sectionId}`;
    const storage = createStorage({ [legacyKey]: legacyValue });

    expect(readSectionCollapsedFromStorage(storage, sectionId, false)).toBe(expectedCollapsed);
    expect(storage.getItem(legacyKey)).toBeNull();
    expect(storage.getItem(sectionCollapseStorageKey(sectionId))).toBe(String(expectedCollapsed));
    expect(readSectionCollapsedFromStorage(storage, sectionId, !expectedCollapsed)).toBe(expectedCollapsed);
  });

  test("uses the corrected fallback when no browser preference exists", () => {
    const storage = createStorage();

    expect(readSectionCollapsedFromStorage(storage, "category", true)).toBe(true);
    expect(readSectionCollapsedFromStorage(storage, "dynamic", false)).toBe(false);
  });

  test("writes only the versioned corrected state", () => {
    const sectionId = "media";
    const legacyKey = `homarr-section-collapsed-${sectionId}`;
    const storage = createStorage({ [legacyKey]: "true" });

    writeSectionCollapsedToStorage(storage, sectionId, true);

    expect(storage.getItem(legacyKey)).toBeNull();
    expect(storage.getItem(sectionCollapseStorageKey(sectionId))).toBe("true");
  });
});

const createStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};
