import path from "node:path";
import { describe, expect, it } from "vitest";

import { collectBoardStaticGraph, getRuntimeModuleSpecifiers } from "./board-static-graph.mts";

describe("board static dependency graph", () => {
  it("ignores type-only and dynamic imports", () => {
    expect(
      getRuntimeModuleSpecifiers(
        [
          'import type { A } from "type-only";',
          'import { type B } from "also-type-only";',
          'import { C, type D } from "runtime";',
          'export type { E } from "export-type";',
          'export { type F } from "also-export-type";',
          'export { G } from "runtime-export";',
          'export * from "runtime-star";',
          'import "runtime-side-effect";',
          "import {",
          "  H,",
          "  type I,",
          '} from "runtime-multiline";',
          'void import("lazy");',
        ].join("\n"),
        "fixture.ts",
      ),
    ).toEqual(["runtime", "runtime-export", "runtime-star", "runtime-side-effect", "runtime-multiline"]);
  });

  it("keeps widget registries, editors, Spotlight, and onboarding tour out of the board's static graph", () => {
    const result = collectBoardStaticGraph(path.resolve("."));
    expect(result.visitedModuleCount).toBeGreaterThan(0);
    expect(result.bareWidgetImports).toEqual([]);
    expect(result.reachedForbiddenModules).toEqual([]);
    expect(result.unresolvedWorkspaceImports).toEqual([]);
  });
});
