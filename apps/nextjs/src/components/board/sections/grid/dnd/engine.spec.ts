import { describe, expect, test } from "vitest";

import { doGridPlacementsOverlap } from "~/components/board/layout";
import {
  beginGridTransaction,
  cancelGridTransaction,
  commitGridTransaction,
  previewGridMove,
  previewGridResize,
} from "./engine";
import type {
  GridPreviewResult,
  GridResizeDirection,
  GridTransaction,
  TransactionalGrid,
  TransactionalGridState,
} from "./types";

interface TestPlacement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: "section" | "item";
  marker?: string;
}

const placement = (
  id: string,
  x: number,
  y: number,
  w = 1,
  h = 1,
  type: TestPlacement["type"] = "item",
): TestPlacement => ({ id, x, y, w, h, type, marker: `metadata:${id}` });

const grid = (
  id: string,
  columnCount: number,
  placements: readonly TestPlacement[],
  options: Pick<TransactionalGrid<TestPlacement>, "maxRowCount" | "ownerPlacementId" | "parentGridId"> = {},
): TransactionalGrid<TestPlacement> => ({ id, columnCount, placements, ...options });

const state = (...grids: readonly TransactionalGrid<TestPlacement>[]): TransactionalGridState<TestPlacement> => ({
  grids,
});

const accept = (result: GridPreviewResult<TestPlacement>): GridTransaction<TestPlacement> => {
  if (!result.accepted) throw new Error(`Expected preview to be accepted, received ${result.rejection.code}`);
  return result.transaction;
};

const getGrid = (layout: TransactionalGridState<TestPlacement>, id: string) => {
  const found = layout.grids.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing test grid ${id}`);
  return found;
};

const getPlacement = (layout: TransactionalGridState<TestPlacement>, id: string) => {
  for (const candidateGrid of layout.grids) {
    const found = candidateGrid.placements.find((candidate) => candidate.id === id);
    if (found) return found;
  }
  throw new Error(`Missing test placement ${id}`);
};

const coordinatesById = (layout: TransactionalGridState<TestPlacement>, gridId: string) =>
  Object.fromEntries(getGrid(layout, gridId).placements.map(({ id, x, y, w, h }) => [id, { x, y, w, h }]));

const expectValidState = (layout: TransactionalGridState<TestPlacement>) => {
  const allIds = new Set<string>();

  for (const candidateGrid of layout.grids) {
    for (const [index, candidate] of candidateGrid.placements.entries()) {
      expect(allIds.has(candidate.id), `duplicate placement ${candidate.id}`).toBe(false);
      allIds.add(candidate.id);
      expect([candidate.x, candidate.y, candidate.w, candidate.h].every(Number.isInteger)).toBe(true);
      expect(candidate.x).toBeGreaterThanOrEqual(0);
      expect(candidate.y).toBeGreaterThanOrEqual(0);
      expect(candidate.w).toBeGreaterThanOrEqual(1);
      expect(candidate.h).toBeGreaterThanOrEqual(1);
      expect(candidate.x + candidate.w).toBeLessThanOrEqual(candidateGrid.columnCount);
      if (candidateGrid.maxRowCount !== undefined && candidateGrid.maxRowCount !== null) {
        expect(candidate.y + candidate.h).toBeLessThanOrEqual(candidateGrid.maxRowCount);
      }

      for (const other of candidateGrid.placements.slice(index + 1)) {
        expect(
          doGridPlacementsOverlap(candidate, other),
          `${candidate.id} overlaps ${other.id} in ${candidateGrid.id}`,
        ).toBe(false);
      }
    }
  }

  for (const candidateGrid of layout.grids) {
    if (!candidateGrid.ownerPlacementId) continue;
    const parent = getGrid(layout, candidateGrid.parentGridId ?? "");
    expect(parent.placements.some(({ id }) => id === candidateGrid.ownerPlacementId)).toBe(true);
  }
};

describe("grid transaction setup", () => {
  test("captures detached snapshot and preview copies without mutating caller state", () => {
    const original = state(grid("root", 4, [placement("active", 0, 0), placement("other", 2, 3)]));
    const transaction = beginGridTransaction(original, { activeId: "active", sourceGridId: "root" });

    expect(transaction.snapshot).toEqual(original);
    expect(transaction.preview).toEqual(original);
    expect(transaction.snapshot).not.toBe(original);
    expect(transaction.snapshot.grids[0]).not.toBe(original.grids[0]);
    expect(transaction.snapshot.grids[0]?.placements[0]).not.toBe(original.grids[0]?.placements[0]);
    expect(transaction.preview).not.toBe(transaction.snapshot);
  });

  test("rejects a missing active item or stale source-grid hint", () => {
    const original = state(grid("root", 2, [placement("active", 0, 0)]));

    expect(() => beginGridTransaction(original, { activeId: "missing" })).toThrow('Grid item "missing" does not exist');
    expect(() => beginGridTransaction(original, { activeId: "active", sourceGridId: "stale" })).toThrow(
      'belongs to grid "root", not "stale"',
    );
  });

  test.each([
    {
      name: "duplicate grid ids",
      layout: state(grid("root", 2, [placement("a", 0, 0)]), grid("root", 2, [placement("b", 0, 0)])),
      message: "Duplicate grid id",
    },
    {
      name: "duplicate placement ids across grids",
      layout: state(grid("first", 2, [placement("a", 0, 0)]), grid("second", 2, [placement("a", 0, 0)])),
      message: "Duplicate grid item id",
    },
    {
      name: "overlaps",
      layout: state(grid("root", 3, [placement("a", 0, 0, 2), placement("b", 1, 0, 2)])),
      message: "overlap",
    },
    {
      name: "column overflow",
      layout: state(grid("root", 2, [placement("a", 1, 0, 2)])),
      message: "exceeds grid",
    },
    {
      name: "row overflow",
      layout: state(grid("root", 2, [placement("a", 0, 1, 1, 2)], { maxRowCount: 2 })),
      message: "exceeds grid",
    },
    {
      name: "missing hierarchy owner",
      layout: state(
        grid("root", 2, [placement("a", 0, 0)]),
        grid("child", 2, [], { parentGridId: "root", ownerPlacementId: "missing" }),
      ),
      message: "Owner item",
    },
    {
      name: "cyclic hierarchy",
      layout: state(
        grid("first", 2, [placement("owns-second", 0, 0)], {
          parentGridId: "second",
          ownerPlacementId: "owns-first",
        }),
        grid("second", 2, [placement("owns-first", 0, 0)], {
          parentGridId: "first",
          ownerPlacementId: "owns-second",
        }),
      ),
      message: "cycle",
    },
  ])("rejects invalid initial state: $name", ({ layout, message }) => {
    expect(() => beginGridTransaction(layout, { activeId: layout.grids[0]?.placements[0]?.id ?? "missing" })).toThrow(
      message,
    );
  });
});

describe("same-grid movement", () => {
  test("keeps the exact snapshot for a no-op instead of compacting intentional gaps", () => {
    const original = state(grid("root", 4, [placement("active", 0, 3), placement("other", 2, 5)]));
    const transaction = beginGridTransaction(original, { activeId: "active" });
    const moved = accept(previewGridMove(transaction, { targetGridId: "root", x: 0, y: 3 }));

    expect(moved.preview).toEqual(original);
    expect(moved.preview).not.toBe(original);
  });

  test("swaps an equal-size item occupying the requested exact slot", () => {
    const original = state(
      grid("root", 4, [placement("active", 0, 0), placement("target", 1, 0), placement("untouched", 2, 0)]),
    );
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "root",
        x: 1,
        y: 0,
      }),
    );

    expect(coordinatesById(moved.preview, "root")).toEqual({
      active: { x: 1, y: 0, w: 1, h: 1 },
      target: { x: 0, y: 0, w: 1, h: 1 },
      untouched: { x: 2, y: 0, w: 1, h: 1 },
    });
  });

  test("swaps different-size items when both resulting placements remain valid", () => {
    const original = state(grid("root", 4, [placement("wide", 0, 0, 2), placement("compact", 2, 0)]));
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "wide" }), {
        targetGridId: "root",
        x: 2,
        y: 0,
      }),
    );

    expect(coordinatesById(moved.preview, "root")).toEqual({
      wide: { x: 2, y: 0, w: 2, h: 1 },
      compact: { x: 0, y: 0, w: 1, h: 1 },
    });
  });

  test("uses pinned reflow when an exact-slot swap would exceed the grid bounds", () => {
    const original = state(grid("root", 4, [placement("compact", 3, 0), placement("wide", 0, 0, 2)]));
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "compact" }), {
        targetGridId: "root",
        x: 0,
        y: 0,
      }),
    );

    expect(coordinatesById(moved.preview, "root")).toEqual({
      compact: { x: 0, y: 0, w: 1, h: 1 },
      wide: { x: 0, y: 1, w: 2, h: 1 },
    });
  });

  test("pushes a different-size collision without compacting unrelated gaps", () => {
    const original = state(
      grid("root", 4, [placement("active", 0, 0), placement("wide", 1, 0, 2), placement("lower-left", 0, 1)]),
    );
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "root",
        x: 1,
        y: 0,
      }),
    );

    expect(coordinatesById(moved.preview, "root")).toEqual({
      active: { x: 1, y: 0, w: 1, h: 1 },
      wide: { x: 1, y: 1, w: 2, h: 1 },
      "lower-left": { x: 0, y: 1, w: 1, h: 1 },
    });
  });

  test("swaps laterally as soon as a move pushes into one compatible item", () => {
    const original = state(grid("root", 5, [placement("active", 0, 0, 2), placement("target", 2, 0, 2)]));
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "root",
        x: 1,
        y: 0,
      }),
    );

    expect(getPlacement(moved.preview, "active")).toMatchObject({ x: 2, y: 0, w: 2, h: 1 });
    expect(getPlacement(moved.preview, "target")).toMatchObject({ x: 0, y: 0, w: 2, h: 1 });
  });

  test("swaps the pushed item into the vacated slot when moving from right to left", () => {
    const original = state(grid("root", 5, [placement("target", 0, 0, 2), placement("active", 2, 0, 2)]));
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "root",
        x: 1,
        y: 0,
      }),
    );

    expect(getPlacement(moved.preview, "active")).toMatchObject({ x: 0, y: 0, w: 2, h: 1 });
    expect(getPlacement(moved.preview, "target")).toMatchObject({ x: 2, y: 0, w: 2, h: 1 });
  });

  test("preserves intentional empty rows outside the collision chain", () => {
    const original = state(
      grid("root", 4, [placement("active", 0, 0), placement("collision", 1, 0, 2), placement("far", 3, 8)]),
    );
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "root",
        x: 1,
        y: 0,
      }),
    );

    expect(getPlacement(moved.preview, "collision")).toMatchObject({ x: 1, y: 1 });
    expect(getPlacement(moved.preview, "far")).toMatchObject({ x: 3, y: 8 });
  });

  test("keeps a container fixed when an item is moved onto it", () => {
    const original = state(grid("root", 4, [placement("active", 0, 0), placement("container", 1, 0, 2, 2, "section")]));
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "root",
        x: 1,
        y: 0,
      }),
    );

    expect(getPlacement(moved.preview, "container")).toMatchObject({ x: 1, y: 0, w: 2, h: 2 });
    expect(getPlacement(moved.preview, "active")).toMatchObject({ x: 1, y: 2 });
  });

  test("lets an active container push an item", () => {
    const original = state(
      grid("root", 4, [placement("container", 0, 0, 2, 2, "section"), placement("item", 2, 0, 2)]),
    );
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "container" }), {
        targetGridId: "root",
        x: 2,
        y: 0,
      }),
    );

    expect(getPlacement(moved.preview, "container")).toMatchObject({ x: 2, y: 0, w: 2, h: 2 });
    expect(getPlacement(moved.preview, "item")).toMatchObject({ x: 0, y: 0 });
  });

  test("does not let an active container displace another container", () => {
    const original = state(
      grid("root", 4, [
        placement("active-container", 0, 0, 2, 2, "section"),
        placement("fixed-container", 2, 0, 2, 2, "section"),
      ]),
    );
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active-container" }), {
        targetGridId: "root",
        x: 2,
        y: 0,
      }),
    );

    expect(getPlacement(moved.preview, "fixed-container")).toMatchObject({ x: 2, y: 0 });
    expect(getPlacement(moved.preview, "active-container")).toMatchObject({ x: 2, y: 2 });
  });

  test.each([
    { requested: { x: -20, y: -10 }, expected: { x: 0, y: 0 } },
    { requested: { x: 99, y: 99 }, expected: { x: 2, y: 3 } },
    { requested: { x: 2.9, y: 1.9 }, expected: { x: 2, y: 1 } },
  ])("clamps and quantizes requested coordinates: $requested", ({ requested, expected }) => {
    const original = state(grid("root", 4, [placement("active", 1, 1, 2, 2)], { maxRowCount: 5 }));
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "root",
        ...requested,
      }),
    );

    expect(getPlacement(moved.preview, "active")).toMatchObject(expected);
  });

  test("produces the same result regardless of backing-array order", () => {
    const placements = [
      placement("active", 3, 0),
      placement("left", 0, 2),
      placement("middle", 1, 2),
      placement("right", 2, 2),
    ];
    const forward = state(grid("root", 4, placements));
    const reversed = state(grid("root", 4, placements.toReversed()));
    const input = { targetGridId: "root", x: 0, y: 0 };

    const first = accept(previewGridMove(beginGridTransaction(forward, { activeId: "active" }), input));
    const second = accept(previewGridMove(beginGridTransaction(reversed, { activeId: "active" }), input));

    expect(coordinatesById(first.preview, "root")).toEqual(coordinatesById(second.preview, "root"));
  });

  test("recomputes every chained preview from the interaction snapshot", () => {
    const original = state(
      grid("root", 3, [placement("active", 0, 0), placement("middle", 1, 0), placement("last", 2, 0)]),
    );
    const transaction = beginGridTransaction(original, { activeId: "active" });
    const first = accept(previewGridMove(transaction, { targetGridId: "root", x: 1, y: 0 }));
    const second = accept(previewGridMove(first, { targetGridId: "root", x: 2, y: 0 }));

    expect(coordinatesById(first.preview, "root")).toEqual({
      active: { x: 1, y: 0, w: 1, h: 1 },
      middle: { x: 0, y: 0, w: 1, h: 1 },
      last: { x: 2, y: 0, w: 1, h: 1 },
    });
    expect(coordinatesById(second.preview, "root")).toEqual({
      active: { x: 2, y: 0, w: 1, h: 1 },
      middle: { x: 1, y: 0, w: 1, h: 1 },
      last: { x: 0, y: 0, w: 1, h: 1 },
    });
  });
});

describe("cross-grid movement", () => {
  test("updates source and target atomically without compacting the source gap", () => {
    const original = state(
      grid("source", 2, [placement("active", 0, 0), placement("source-neighbor", 0, 1)]),
      grid("target", 2, [placement("target-neighbor", 0, 0)]),
    );
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "target",
        x: 0,
        y: 0,
      }),
    );

    expect(coordinatesById(moved.preview, "source")).toEqual({
      "source-neighbor": { x: 0, y: 1, w: 1, h: 1 },
    });
    expect(coordinatesById(moved.preview, "target")).toEqual({
      "target-neighbor": { x: 0, y: 1, w: 1, h: 1 },
      active: { x: 0, y: 0, w: 1, h: 1 },
    });
    expect(getPlacement(moved.preview, "active").marker).toBe("metadata:active");
    expect(original).toEqual(
      state(
        grid("source", 2, [placement("active", 0, 0), placement("source-neighbor", 0, 1)]),
        grid("target", 2, [placement("target-neighbor", 0, 0)]),
      ),
    );
    expectValidState(moved.preview);
  });

  test("chained target changes do not leak an earlier cross-grid preview", () => {
    const original = state(
      grid("source", 2, [placement("active", 0, 0)]),
      grid("first-target", 2, [placement("first-neighbor", 0, 0)]),
      grid("second-target", 2, [placement("second-neighbor", 0, 0)]),
    );
    const first = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "first-target",
        x: 0,
        y: 0,
      }),
    );
    const second = accept(previewGridMove(first, { targetGridId: "second-target", x: 0, y: 0 }));

    expect(getGrid(second.preview, "first-target").placements).toEqual(getGrid(original, "first-target").placements);
    expect(getGrid(second.preview, "source").placements).toHaveLength(0);
    expect(getPlacement(second.preview, "active")).toMatchObject({ x: 0, y: 0 });
    expect(getPlacement(second.preview, "second-neighbor")).toMatchObject({ x: 0, y: 1 });
  });

  test("keeps a destination container fixed when an item enters its grid", () => {
    const original = state(
      grid("source", 4, [placement("active", 0, 0)]),
      grid("target", 4, [placement("container", 1, 0, 2, 2, "section")]),
    );
    const moved = accept(
      previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
        targetGridId: "target",
        x: 1,
        y: 0,
      }),
    );

    expect(getPlacement(moved.preview, "container")).toMatchObject({ x: 1, y: 0, w: 2, h: 2 });
    expect(getPlacement(moved.preview, "active")).toMatchObject({ x: 1, y: 2 });
  });

  test("moves a container's owned grid with it and supports commit/cancel", () => {
    const original = state(
      grid("source", 3, [placement("container", 0, 0, 2, 2, "section")]),
      grid("target", 3, []),
      grid("container-content", 2, [placement("child", 0, 0)], {
        parentGridId: "source",
        ownerPlacementId: "container",
      }),
    );
    const transaction = beginGridTransaction(original, { activeId: "container" });
    const moved = accept(previewGridMove(transaction, { targetGridId: "target", x: 1, y: 2 }));

    expect(getGrid(moved.preview, "container-content").parentGridId).toBe("target");
    expect(getPlacement(moved.preview, "container")).toMatchObject({ x: 1, y: 2, type: "section" });
    expect(cancelGridTransaction(moved)).toEqual(original);
    expect(commitGridTransaction(moved)).toEqual(moved.preview);
    expect(commitGridTransaction(moved)).not.toBe(moved.preview);
  });

  test.each(["child", "grandchild"])("rejects a container move into its %s grid", (targetGridId) => {
    const original = state(
      grid("root", 4, [placement("container", 0, 0, 2, 2, "section")]),
      grid("child", 3, [placement("nested-container", 0, 0, 2, 2, "section")], {
        parentGridId: "root",
        ownerPlacementId: "container",
      }),
      grid("grandchild", 2, [], {
        parentGridId: "child",
        ownerPlacementId: "nested-container",
      }),
    );
    const transaction = beginGridTransaction(original, { activeId: "container" });
    const result = previewGridMove(transaction, { targetGridId, x: 0, y: 0 });

    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("Expected descendant move rejection");
    expect(result.rejection.code).toBe("descendant-target");
    expect(result.transaction).toBe(transaction);
  });

  test("runs caller guards with hierarchy context and preserves custom rejection details", () => {
    const original = state(grid("source", 2, [placement("active", 0, 0)]), grid("target", 2, []));
    const transaction = beginGridTransaction(original, { activeId: "active" });
    let observedTarget = "";
    const guarded = previewGridMove(
      transaction,
      { targetGridId: "target", x: 0, y: 0 },
      {
        guards: [
          (context) => {
            observedTarget = context.targetGrid.id;
            expect(context.active.id).toBe("active");
            expect(context.sourceGrid.id).toBe("source");
            expect(context.targetIsDescendant).toBe(false);
            expect(context.snapshot).toBe(transaction.snapshot);
            return true;
          },
          () => ({ code: "locked-container", message: "Unlock the container first" }),
        ],
      },
    );

    expect(observedTarget).toBe("target");
    expect(guarded.accepted).toBe(false);
    if (guarded.accepted) throw new Error("Expected custom guard rejection");
    expect(guarded.rejection).toEqual({ code: "locked-container", message: "Unlock the container first" });

    const booleanRejection = previewGridMove(
      transaction,
      { targetGridId: "target", x: 0, y: 0 },
      {
        guards: [() => false],
      },
    );
    expect(booleanRejection.accepted).toBe(false);
    if (booleanRejection.accepted) throw new Error("Expected boolean guard rejection");
    expect(booleanRejection.rejection.code).toBe("guard-rejected");
  });

  test.each([
    {
      name: "unknown grid",
      original: state(grid("source", 2, [placement("active", 0, 0)])),
      input: { targetGridId: "missing", x: 0, y: 0 },
      code: "unknown-target-grid",
    },
    {
      name: "destination narrower than the item",
      original: state(grid("source", 3, [placement("active", 0, 0, 2)]), grid("target", 1, [])),
      input: { targetGridId: "target", x: 0, y: 0 },
      code: "item-too-large",
    },
    {
      name: "reflow beyond destination row limit",
      original: state(
        grid("source", 2, [placement("active", 0, 0, 2)]),
        grid("target", 2, [placement("target", 0, 0, 2)], { maxRowCount: 1 }),
      ),
      input: { targetGridId: "target", x: 0, y: 0 },
      code: "row-limit",
    },
    {
      name: "non-finite coordinate",
      original: state(grid("source", 2, [placement("active", 0, 0)])),
      input: { targetGridId: "source", x: Number.NaN, y: 0 },
      code: "invalid-coordinate",
    },
  ])("rejects $name without changing the transaction", ({ original, input, code }) => {
    const transaction = beginGridTransaction(original, { activeId: "active" });
    const result = previewGridMove(transaction, input);

    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("Expected move rejection");
    expect(result.rejection.code).toBe(code);
    expect(result.transaction).toBe(transaction);
    expect(result.transaction.preview).toEqual(original);
  });
});

describe("eight-direction resize", () => {
  test.each<{
    direction: GridResizeDirection;
    deltaColumns: number;
    deltaRows: number;
    expected: Pick<TestPlacement, "x" | "y" | "w" | "h">;
  }>([
    { direction: "n", deltaColumns: 0, deltaRows: -1, expected: { x: 3, y: 2, w: 4, h: 5 } },
    { direction: "ne", deltaColumns: 1, deltaRows: -1, expected: { x: 3, y: 2, w: 5, h: 5 } },
    { direction: "e", deltaColumns: 1, deltaRows: 0, expected: { x: 3, y: 3, w: 5, h: 4 } },
    { direction: "se", deltaColumns: 1, deltaRows: 1, expected: { x: 3, y: 3, w: 5, h: 5 } },
    { direction: "s", deltaColumns: 0, deltaRows: 1, expected: { x: 3, y: 3, w: 4, h: 5 } },
    { direction: "sw", deltaColumns: -1, deltaRows: 1, expected: { x: 2, y: 3, w: 5, h: 5 } },
    { direction: "w", deltaColumns: -1, deltaRows: 0, expected: { x: 2, y: 3, w: 5, h: 4 } },
    { direction: "nw", deltaColumns: -1, deltaRows: -1, expected: { x: 2, y: 2, w: 5, h: 5 } },
  ])("resizes from $direction while anchoring the opposite edge", ({ expected, ...input }) => {
    const original = state(grid("root", 12, [placement("active", 3, 3, 4, 4)], { maxRowCount: 12 }));
    const resized = accept(previewGridResize(beginGridTransaction(original, { activeId: "active" }), input));

    expect(getPlacement(resized.preview, "active")).toMatchObject(expected);
  });

  test("clamps a north-west shrink to minimum size while keeping right and bottom anchored", () => {
    const original = state(grid("root", 12, [placement("active", 3, 3, 4, 4)], { maxRowCount: 12 }));
    const resized = accept(
      previewGridResize(beginGridTransaction(original, { activeId: "active" }), {
        direction: "nw",
        deltaColumns: 10,
        deltaRows: 10,
        minWidth: 2,
        minHeight: 2,
      }),
    );

    expect(getPlacement(resized.preview, "active")).toMatchObject({ x: 5, y: 5, w: 2, h: 2 });
  });

  test.each([
    { direction: "nw" as const, deltaColumns: -99, deltaRows: -99, expected: { x: 0, y: 0, w: 7, h: 7 } },
    { direction: "se" as const, deltaColumns: 99, deltaRows: 99, expected: { x: 3, y: 3, w: 9, h: 9 } },
  ])("clamps $direction growth to grid bounds", ({ expected, ...input }) => {
    const original = state(grid("root", 12, [placement("active", 3, 3, 4, 4)], { maxRowCount: 12 }));
    const resized = accept(previewGridResize(beginGridTransaction(original, { activeId: "active" }), input));

    expect(getPlacement(resized.preview, "active")).toMatchObject(expected);
  });

  test("honors explicit maximum dimensions", () => {
    const original = state(grid("root", 12, [placement("active", 3, 3, 4, 4)], { maxRowCount: 12 }));
    const resized = accept(
      previewGridResize(beginGridTransaction(original, { activeId: "active" }), {
        direction: "se",
        deltaColumns: 99,
        deltaRows: 99,
        maxWidth: 6,
        maxHeight: 5,
      }),
    );

    expect(getPlacement(resized.preview, "active")).toMatchObject({ x: 3, y: 3, w: 6, h: 5 });
  });

  test("pins the resized item and deterministically pushes collisions", () => {
    const original = state(
      grid("root", 3, [placement("active", 0, 0, 2), placement("neighbor", 0, 1, 2), placement("side", 2, 2)]),
    );
    const resized = accept(
      previewGridResize(beginGridTransaction(original, { activeId: "active" }), {
        direction: "s",
        deltaColumns: 0,
        deltaRows: 2,
      }),
    );

    expect(coordinatesById(resized.preview, "root")).toEqual({
      active: { x: 0, y: 0, w: 2, h: 3 },
      neighbor: { x: 0, y: 3, w: 2, h: 1 },
      side: { x: 2, y: 2, w: 1, h: 1 },
    });
  });

  test("rejects resize when collision reflow would exceed the row limit", () => {
    const original = state(
      grid("root", 2, [placement("active", 0, 0, 2), placement("neighbor", 0, 1, 2, 2)], {
        maxRowCount: 3,
      }),
    );
    const transaction = beginGridTransaction(original, { activeId: "active" });
    const result = previewGridResize(transaction, {
      direction: "s",
      deltaColumns: 0,
      deltaRows: 1,
    });

    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("Expected row-limit rejection");
    expect(result.rejection.code).toBe("row-limit");
    expect(result.transaction).toBe(transaction);
  });

  test("rejects non-finite deltas and geometrically impossible constraints", () => {
    const original = state(grid("root", 4, [placement("active", 0, 0, 2, 2)]));
    const transaction = beginGridTransaction(original, { activeId: "active" });
    const invalidDelta = previewGridResize(transaction, {
      direction: "e",
      deltaColumns: Number.POSITIVE_INFINITY,
      deltaRows: 0,
    });
    const impossible = previewGridResize(transaction, {
      direction: "w",
      deltaColumns: 0,
      deltaRows: 0,
      minWidth: 5,
      maxWidth: 5,
    });

    expect(invalidDelta.accepted).toBe(false);
    if (invalidDelta.accepted) throw new Error("Expected invalid-coordinate rejection");
    expect(invalidDelta.rejection.code).toBe("invalid-coordinate");
    expect(impossible.accepted).toBe(false);
    if (impossible.accepted) throw new Error("Expected resize-constraints rejection");
    expect(impossible.rejection.code).toBe("resize-constraints");
  });

  test.each([{ minWidth: 0 }, { minHeight: 1.5 }, { minWidth: 3, maxWidth: 2 }, { minHeight: 3, maxHeight: 2 }])(
    "throws on invalid programmer-supplied constraints: $minWidth $minHeight",
    (constraints) => {
      const original = state(grid("root", 4, [placement("active", 0, 0, 2, 2)]));
      const transaction = beginGridTransaction(original, { activeId: "active" });

      expect(() =>
        previewGridResize(transaction, {
          direction: "se",
          deltaColumns: 0,
          deltaRows: 0,
          ...constraints,
        }),
      ).toThrow(RangeError);
    },
  );
});

describe("transaction completion", () => {
  test("a rejection keeps the latest accepted preview, cancel restores start, and commit detaches output", () => {
    const original = state(grid("root", 3, [placement("active", 0, 0), placement("other", 1, 0)]));
    const started = beginGridTransaction(original, { activeId: "active" });
    const moved = accept(previewGridMove(started, { targetGridId: "root", x: 1, y: 0 }));
    const rejected = previewGridMove(moved, { targetGridId: "missing", x: 0, y: 0 });

    expect(rejected.accepted).toBe(false);
    if (rejected.accepted) throw new Error("Expected rejection");
    expect(rejected.transaction).toBe(moved);
    expect(rejected.transaction.preview).toEqual(moved.preview);

    const committed = commitGridTransaction(rejected.transaction);
    const cancelled = cancelGridTransaction(rejected.transaction);
    expect(committed).toEqual(moved.preview);
    expect(committed).not.toBe(moved.preview);
    expect(cancelled).toEqual(original);
    expect(cancelled).not.toBe(rejected.transaction.snapshot);
  });
});

describe("interaction invariant matrix", () => {
  test("preserves invariants across every sampled same-grid and cross-grid coordinate", () => {
    const original = state(
      grid(
        "source",
        6,
        [
          placement("active", 0, 0, 2, 2),
          placement("source-a", 2, 0, 2),
          placement("source-b", 4, 0, 2, 2),
          placement("source-c", 2, 1, 2),
        ],
        { maxRowCount: 10 },
      ),
      grid("target", 5, [placement("target-a", 0, 0), placement("target-b", 1, 0, 2, 2)], {
        maxRowCount: 10,
      }),
    );

    for (const targetGridId of ["source", "target"]) {
      for (let x = -3; x <= 8; x += 1) {
        for (let y = -2; y <= 11; y += 1) {
          const result = previewGridMove(beginGridTransaction(original, { activeId: "active" }), {
            targetGridId,
            x,
            y,
          });
          if (!result.accepted) {
            expect(result.rejection.code).toBe("row-limit");
            continue;
          }

          expectValidState(result.transaction.preview);
          expect(getPlacement(result.transaction.preview, "active").marker).toBe("metadata:active");
        }
      }
    }
  });

  test("preserves invariants across every direction and representative signed deltas", () => {
    const original = state(grid("root", 8, [placement("active", 2, 2, 3, 3)], { maxRowCount: 9 }));
    const directions: readonly GridResizeDirection[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
    const deltas = [-20, -3, -1, 0, 1, 3, 20];

    for (const direction of directions) {
      for (const deltaColumns of deltas) {
        for (const deltaRows of deltas) {
          const result = previewGridResize(beginGridTransaction(original, { activeId: "active" }), {
            direction,
            deltaColumns,
            deltaRows,
            minWidth: 2,
            minHeight: 2,
            maxWidth: 6,
            maxHeight: 7,
          });
          expect(result.accepted).toBe(true);
          if (!result.accepted) throw new Error(`Unexpected ${result.rejection.code} for ${direction}`);
          expectValidState(result.transaction.preview);
          expect(getPlacement(result.transaction.preview, "active").marker).toBe("metadata:active");
        }
      }
    }
  });
});
