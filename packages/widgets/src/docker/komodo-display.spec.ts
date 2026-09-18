import { describe, expect, test } from "vitest";

import {
  getKomodoStateTranslationKey,
  getKomodoSummaryColumnCount,
  isContainerColumnVisible,
  isContainerContextMenuEnabled,
  usesKomodoServerTableLayout,
} from "./komodo-display";

describe("getKomodoStateTranslationKey", () => {
  test.each([
    ["Ok", "ok"],
    ["NotOk", "notOk"],
    ["not_deployed", "notDeployed"],
    ["restarting", "restarting"],
  ])("maps %s to %s", (state, expected) => {
    expect(getKomodoStateTranslationKey(state)).toBe(expected);
  });

  test("falls back to unknown for future states", () => {
    expect(getKomodoStateTranslationKey("future_state")).toBe("unknown");
  });
});

describe("isContainerColumnVisible", () => {
  const selectedColumns = new Set(["name", "state", "host", "cpuUsage", "memoryUsage", "actions"]);
  const visibleColumns = (isKomodo: boolean) =>
    [...selectedColumns].filter((accessor) => isContainerColumnVisible(accessor, selectedColumns, isKomodo));

  test("keeps every selected column for the native Docker source", () => {
    expect(visibleColumns(false)).toEqual(["name", "state", "host", "cpuUsage", "memoryUsage", "actions"]);
  });

  test("drops the actions column for Komodo, which cannot control containers", () => {
    expect(visibleColumns(true)).toEqual(["name", "state", "host", "cpuUsage", "memoryUsage"]);
  });

  test("hides columns the user did not select", () => {
    expect(isContainerColumnVisible("host", new Set(["name"]), false)).toBe(false);
  });
});

describe("usesKomodoServerTableLayout", () => {
  test.each([
    [320, false],
    [699, false],
    [700, true],
    [1200, true],
  ])("width %s uses the table layout: %s", (width, expected) => {
    expect(usesKomodoServerTableLayout(width)).toBe(expected);
  });
});

describe("getKomodoSummaryColumnCount", () => {
  test.each([
    [320, 1],
    [399, 1],
    [400, 2],
    [719, 2],
    [720, 4],
    [1200, 4],
  ])("width %s results in %s columns", (width, expected) => {
    expect(getKomodoSummaryColumnCount(width)).toBe(expected);
  });
});

describe("isContainerContextMenuEnabled", () => {
  test.each([
    [false, false, true],
    [true, false, false],
    [false, true, false],
    [true, true, false],
  ])("edit mode %s and Komodo %s results in %s", (isEditMode, isKomodo, expected) => {
    expect(isContainerContextMenuEnabled(isEditMode, isKomodo)).toBe(expected);
  });
});
