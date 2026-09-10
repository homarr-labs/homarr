import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  beginGridTransaction,
  cancelGridTransaction,
  commitGridTransaction,
  previewGridMove,
  previewGridResize,
} from "../../apps/nextjs/src/components/board/sections/grid/dnd/engine.ts";
import type {
  GridMoveInput,
  GridResizeDirection,
  GridResizeInput,
  GridTransaction,
  TransactionalGridState,
} from "../../apps/nextjs/src/components/board/sections/grid/dnd/types.ts";

const usage =
  "pnpm exec tsx --tsconfig apps/nextjs/tsconfig.json scripts/regressions/grid-fuzz.mts [--seed 6545] [--steps 1000] [--output /tmp/homarr-grid-fuzz]";
const values = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  if (flag === "--help") {
    console.log(usage);
    process.exit(0);
  }
  const value = process.argv[index + 1];
  if (!flag || !["--seed", "--steps", "--output"].includes(flag) || !value || values.has(flag)) {
    throw new Error(`Invalid or duplicate argument: ${String(flag)}\n${usage}`);
  }
  values.set(flag, value);
}

const integerOption = (flag: string, fallback: number, minimum: number, maximum: number) => {
  const value = values.get(flag) ?? String(fallback);
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${flag} must be an integer between ${minimum} and ${maximum}`);
  }
  return number;
};
const seed = integerOption("--seed", 6545, 0, 0xffff_ffff);
const steps = integerOption("--steps", 1000, 1, 100_000);
const outputDirectory = path.resolve(values.get("--output") ?? "/tmp/homarr-grid-fuzz");
const root = path.resolve(import.meta.dirname, "../..");

// Mulberry32 makes the complete operation stream repeatable, including seed zero.
let randomState = seed;
const randomInt = (minimum: number, maximum: number) => {
  randomState = (randomState + 0x6d2b79f5) >>> 0;
  let value = randomState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const fraction = ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  return minimum + Math.floor(fraction * (maximum - minimum + 1));
};
const pick = <T,>(choices: readonly T[]): T => {
  const value = choices[randomInt(0, choices.length - 1)];
  assert.notEqual(value, undefined, "Cannot pick from an empty collection");
  return value as T;
};

interface Placement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: "section" | "item";
  marker: string;
}
type State = TransactionalGridState<Placement>;
const placement = (id: string, y: number, type: Placement["type"] = "item"): Placement => ({
  id,
  x: 0,
  y,
  w: randomInt(1, 3),
  h: randomInt(1, 2),
  type,
  marker: `metadata:${id}`,
});
const initialState: State = {
  grids: [
    {
      id: "root",
      columnCount: randomInt(6, 12),
      maxRowCount: 24,
      placements: [
        placement("container", 0, "section"),
        ...Array.from({ length: 5 }, (_, i) => placement(`root-${i}`, 3 + i * 3)),
      ],
    },
    {
      id: "other",
      columnCount: randomInt(4, 10),
      maxRowCount: 24,
      placements: Array.from({ length: 4 }, (_, i) => placement(`other-${i}`, i * 3)),
    },
    {
      id: "child",
      columnCount: randomInt(4, 8),
      maxRowCount: 24,
      parentGridId: "root",
      ownerPlacementId: "container",
      placements: [placement("nested-container", 0, "section"), placement("child-item", 3)],
    },
    {
      id: "nested",
      columnCount: randomInt(3, 6),
      maxRowCount: 24,
      parentGridId: "child",
      ownerPlacementId: "nested-container",
      placements: [placement("nested-item", 0)],
    },
  ],
};
const allPlacements = (state: State) => state.grids.flatMap((grid) => grid.placements);
const expectedMetadata = allPlacements(initialState)
  .map(({ id, type, marker }) => ({ id, type, marker }))
  .toSorted((a, b) => a.id.localeCompare(b.id));
const freezeState = (state: State) => {
  for (const grid of state.grids) {
    for (const item of grid.placements) Object.freeze(item);
    Object.freeze(grid.placements);
    Object.freeze(grid);
  }
  Object.freeze(state.grids);
  return Object.freeze(state);
};
const assertState = (state: State) => {
  assert.deepEqual(
    state.grids.map(({ id }) => id).toSorted(),
    initialState.grids.map(({ id }) => id).toSorted(),
    "Grid IDs changed",
  );
  assert.deepEqual(
    allPlacements(state)
      .map(({ id, type, marker }) => ({ id, type, marker }))
      .toSorted((a, b) => a.id.localeCompare(b.id)),
    expectedMetadata,
    "Placement IDs or metadata changed",
  );
  for (const grid of state.grids) {
    for (const [index, item] of grid.placements.entries()) {
      assert.ok([item.x, item.y, item.w, item.h].every(Number.isInteger), `Non-integer geometry: ${item.id}`);
      assert.ok(item.x >= 0 && item.y >= 0 && item.w >= 1 && item.h >= 1, `Invalid geometry: ${item.id}`);
      assert.ok(
        item.x + item.w <= grid.columnCount && item.y + item.h <= (grid.maxRowCount ?? Infinity),
        `Out of bounds: ${item.id}`,
      );
      for (const other of grid.placements.slice(index + 1)) {
        const overlaps =
          item.x < other.x + other.w &&
          item.x + item.w > other.x &&
          item.y < other.y + other.h &&
          item.y + item.h > other.y;
        assert.ok(!overlaps, `Overlap: ${item.id} and ${other.id} in ${grid.id}`);
      }
    }
    if (grid.ownerPlacementId) {
      const parent = state.grids.find(({ id }) => id === grid.parentGridId);
      assert.ok(
        parent?.placements.some(({ id }) => id === grid.ownerPlacementId),
        `Missing owner: ${grid.id}`,
      );
    }
    const visited = new Set([grid.id]);
    let parentId = grid.parentGridId;
    while (parentId) {
      assert.ok(!visited.has(parentId), `Ownership cycle: ${grid.id}`);
      visited.add(parentId);
      const parent = state.grids.find(({ id }) => id === parentId);
      assert.ok(parent, `Missing parent: ${parentId}`);
      parentId = parent.parentGridId;
    }
  }
};

type Operation = { kind: "move"; input: GridMoveInput } | { kind: "resize"; input: GridResizeInput };
const applyOperation = (transaction: GridTransaction<Placement>, operation: Operation) => {
  if (operation.kind === "move") return previewGridMove(transaction, operation.input);
  return previewGridResize(transaction, operation.input);
};
interface TranscriptEntry {
  step: number;
  activeId: string;
  previews: Array<{ operation: Operation; accepted?: boolean; rejection?: string }>;
  completion: "commit" | "cancel";
}
const directions: GridResizeDirection[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
const transcript: TranscriptEntry[] = [];
const counts = { accepted: 0, rejected: 0, commits: 0, cancels: 0, rejections: {} as Record<string, number> };
let state = freezeState(initialState);

try {
  assertState(state);
  for (let step = 0; step < steps; step += 1) {
    const activeId = pick(allPlacements(state)).id;
    const entry: TranscriptEntry = { step, activeId, previews: [], completion: "commit" };
    if (randomInt(0, 3) === 0) entry.completion = "cancel";
    transcript.push(entry);
    const started = beginGridTransaction(state, { activeId });
    const snapshot = structuredClone(started.snapshot);
    let transaction = started;
    const move = randomInt(0, 1) === 0;
    const previewCount = randomInt(1, 4);
    for (let preview = 0; preview < previewCount; preview += 1) {
      let operation: Operation;
      if (move) {
        let targetGridId = pick(state.grids).id;
        if (randomInt(0, 19) === 0) targetGridId = "missing-grid";
        operation = { kind: "move", input: { targetGridId, x: randomInt(-4, 16) / 2, y: randomInt(-4, 56) / 2 } };
      } else {
        operation = {
          kind: "resize",
          input: {
            direction: pick(directions),
            deltaColumns: randomInt(-12, 12),
            deltaRows: randomInt(-12, 12),
            minWidth: 1,
            minHeight: 1,
          },
        };
      }
      const event: TranscriptEntry["previews"][number] = { operation };
      entry.previews.push(event);
      const previous = structuredClone(transaction);
      const result = applyOperation(transaction, operation);
      assert.deepEqual(transaction, previous, "Preview mutated its input transaction");
      event.accepted = result.accepted;
      if (result.accepted) {
        counts.accepted += 1;
        // Repeated pointer events must not accumulate displacement.
        const repeated = applyOperation(result.transaction, operation);
        assert.deepEqual(repeated, result, "Identical preview accumulated drift");
        transaction = result.transaction;
      } else {
        counts.rejected += 1;
        event.rejection = result.rejection.code;
        counts.rejections[result.rejection.code] = (counts.rejections[result.rejection.code] ?? 0) + 1;
        assert.equal(result.transaction, transaction, "Rejection discarded the last accepted preview");
      }
      assert.deepEqual(transaction.snapshot, snapshot, "Transaction snapshot changed");
      assertState(transaction.preview);
    }
    if (entry.completion === "cancel") {
      state = cancelGridTransaction(transaction);
      assert.deepEqual(state, snapshot, "Cancel failed to restore the starting state");
      counts.cancels += 1;
    } else {
      state = commitGridTransaction(transaction);
      assert.deepEqual(state, transaction.preview, "Commit differs from accepted preview");
      counts.commits += 1;
    }
    assert.notEqual(state, transaction.preview, "Completion retained transaction state reference");
    assertState(state);
    freezeState(state);
  }
  console.log(JSON.stringify({ status: "passed", scope: "v2-grid-invariants", seed, steps, ...counts }, null, 2));
} catch (error) {
  const sources = [
    "scripts/regressions/grid-fuzz.mts",
    ...["sections/grid/dnd/engine.ts", "layout/geometry.ts", "layout/reflow.ts", "layout/constants.ts"].map(
      (file) => `apps/nextjs/src/components/board/${file}`,
    ),
  ];
  const hashes = Object.fromEntries(
    await Promise.all(
      sources.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(path.join(root, file)))
          .digest("hex"),
      ]),
    ),
  );
  let revision = "unknown";
  try {
    revision = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    /* A source archive may not contain Git metadata. */
  }
  await mkdir(outputDirectory, { recursive: true });
  const artifact = path.join(outputDirectory, `grid-fuzz-${seed}-${Date.now()}-${process.pid}.json`);
  await writeFile(
    artifact,
    `${JSON.stringify({ schemaVersion: 1, seed, steps, revision, hashes, initialState, state, transcript, error: String(error), stack: error instanceof Error ? error.stack : undefined }, null, 2)}\n`,
  );
  console.error(
    `Grid fuzz failed. Reproduce with the same source revision:\n${usage.split(" [")[0]} --seed ${seed} --steps ${steps}\nArtifact: ${artifact}`,
  );
  throw error;
}
