import type { SanityCheck } from "../../packages/boards/src/sanity-report.ts";
import type { Placement } from "./fixtures.mts";

export interface ObservedPlacement extends Placement {
  bounds: { x: number; y: number; width: number; height: number };
}

export function checkGeometry(expected: Placement[], observed: ObservedPlacement[]): SanityCheck[] {
  const checks: SanityCheck[] = [];
  const record = (id: string, label: string, expectedValue: unknown, observedValue: unknown, passed: boolean) => {
    let status: SanityCheck["status"] = "failed";
    if (passed) status = "passed";
    checks.push({
      id,
      label,
      status,
      expected: JSON.stringify(expectedValue),
      observed: JSON.stringify(observedValue),
    });
  };
  for (const placement of expected) {
    const actual = observed.find((item) => item.id === placement.id);
    const logical = [placement.x, placement.y, placement.w, placement.h];
    const actualLogical = actual && [actual.x, actual.y, actual.w, actual.h];
    record(
      `${placement.id}:logical`,
      `${placement.id}: saved grid footprint`,
      logical,
      actualLogical ?? "missing",
      Boolean(
        actual &&
        actual.parent === placement.parent &&
        logical.every((value, index) => value === actualLogical?.[index]),
      ),
    );
    if (!actual) continue;
    if (placement.parent === "root") {
      // Independent contract: root grid tracks are square, so a 2×1 footprint is twice as wide as high.
      const expectedHeight = (actual.bounds.width / placement.w) * placement.h;
      record(
        `${placement.id}:pixels`,
        `${placement.id}: rendered height`,
        `${expectedHeight.toFixed(2)}px ±1.5px`,
        actual.bounds.height,
        actual.bounds.width > 0 && Math.abs(expectedHeight - actual.bounds.height) <= 1.5,
      );
    }
  }
  const collisions: string[] = [];
  for (let index = 0; index < observed.length; index++) {
    const left = observed[index];
    if (!left) continue;
    for (const right of observed.slice(index + 1)) {
      if (left.parent !== right.parent) continue;
      const a = left.bounds;
      const b = right.bounds;
      if (
        Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1
      )
        collisions.push(`${left.id}/${right.id}`);
    }
  }
  record("no-overlap", "Sibling footprints do not overlap", [], collisions, collisions.length === 0);
  return checks;
}
