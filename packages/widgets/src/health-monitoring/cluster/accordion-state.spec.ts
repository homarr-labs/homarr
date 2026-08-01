import { describe, expect, test } from "vitest";

import { getClusterAccordionDefault } from "./accordion-state";

describe("getClusterAccordionDefault", () => {
  test("opens only the first visible section in compact mode", () => {
    expect(getClusterAccordionDefault("compact", ["node", "qemu", "storage"])).toEqual(["node"]);
  });

  test("opens every visible section in advanced mode", () => {
    expect(getClusterAccordionDefault("advanced", ["node", "qemu", "storage"])).toEqual(["node", "qemu", "storage"]);
  });

  test("does not invent a section when none are visible", () => {
    expect(getClusterAccordionDefault("compact", [])).toEqual([]);
  });
});
