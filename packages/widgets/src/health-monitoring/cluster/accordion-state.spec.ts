import { describe, expect, test } from "vitest";

import { clusterSections, getClusterAccordionDefault, getClusterVisibleSections } from "./accordion-state";

describe("getClusterVisibleSections", () => {
  test("keeps the configured sections in compact mode", () => {
    expect(getClusterVisibleSections("compact", ["node", "storage"])).toEqual(["node", "storage"]);
  });

  test("shows every cluster section in advanced mode", () => {
    expect(getClusterVisibleSections("advanced", ["node"])).toEqual(clusterSections);
  });
});

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
