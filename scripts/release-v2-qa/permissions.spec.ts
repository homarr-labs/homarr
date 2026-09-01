import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getReleaseV2QaExpectedBoardAccess,
  releaseV2QaPacketBoardAccess,
  validateReleaseV2QaPacketBoardAccess,
} from "./permissions.mts";

interface CoverageManifest {
  boards: { id: string }[];
  packets: { id: string; boards: string[]; personas: string[] }[];
  personas: string[];
}

const coverageManifest = JSON.parse(
  await readFile(resolve(import.meta.dirname, "../../qa/release-v2/coverage-manifest.json"), "utf8"),
) as CoverageManifest;

describe("release-v2 QA packet board access", () => {
  it("covers every assigned packet persona and board combination", () => {
    expect(validateReleaseV2QaPacketBoardAccess(coverageManifest, releaseV2QaPacketBoardAccess)).toEqual([]);
    expect(Object.keys(releaseV2QaPacketBoardAccess)).toHaveLength(45);
  });

  it("grants mutation access to specialized packet owners without unrelated boards", () => {
    const access = getReleaseV2QaExpectedBoardAccess(releaseV2QaPacketBoardAccess);

    expect(access["Casey Chaos"]).toEqual({
      "qa-custom-widget-assistant": "full",
      "qa-dense-collisions": "modify",
      "qa-download-upload": "full",
      "qa-grid-24": "full",
      "qa-widgets-12": "modify",
    });
    expect(access["Morgan Mobile"]).toEqual({
      "qa-layout-boundaries": "modify",
      "qa-widgets-01": "modify",
    });
    expect(access["Brooke Minimalist"]).toEqual({
      "qa-icons-bookmarks": "modify",
      "qa-widgets-01": "modify",
    });
    expect(access["Cora Creator"]).toEqual({
      "qa-custom-widget-assistant": "modify",
      "qa-widgets-02": "modify",
      "qa-widgets-03": "modify",
      "qa-widgets-12": "modify",
    });
    expect(access["Ash Assistant"]).toEqual({
      "qa-custom-widget-assistant": "modify",
      "qa-widgets-12": "modify",
    });
  });

  it("preserves owner, editor, viewer, outsider, and administrator invariants", () => {
    const access = getReleaseV2QaExpectedBoardAccess(releaseV2QaPacketBoardAccess);

    expect(Object.values(access["Avery Admin"] ?? {})).not.toContain("none");
    expect(Object.values(access["Avery Admin"] ?? {})).not.toContain("view");
    expect(Object.values(access["Avery Admin"] ?? {})).not.toContain("modify");
    expect(access["Rowan Owner"]?.["qa-permissions-public"]).toBe("full");
    expect(access["Eden Editor"]?.["qa-permissions-public"]).toBe("modify");
    expect(Object.values(access["Vivian Viewer"] ?? {})).toEqual(expect.arrayContaining(["view"]));
    expect(new Set(Object.values(access["Vivian Viewer"] ?? {}))).toEqual(new Set(["view"]));
    expect(new Set(Object.values(access["Nolan Outsider"] ?? {}))).toEqual(new Set(["none"]));
  });
});
