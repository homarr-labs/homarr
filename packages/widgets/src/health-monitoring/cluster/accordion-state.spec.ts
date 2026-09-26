import { describe, expect, test } from "vitest";

import { clusterSections, getClusterVisibleSections } from "./accordion-state";

describe("getClusterVisibleSections", () => {
  test("keeps the configured sections in compact mode", () => {
    expect(getClusterVisibleSections("compact", ["node", "storage"])).toEqual(["node", "storage"]);
  });

  test("shows every cluster section in advanced mode", () => {
    expect(getClusterVisibleSections("advanced", ["node"])).toEqual(clusterSections);
  });
});
