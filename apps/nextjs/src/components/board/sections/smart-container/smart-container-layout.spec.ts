import { expect, it } from "vitest";

import { smartContainerOptionsSchema, smartContainerStateSchema } from "@homarr/validation/smart-container";
import type { WidgetActivity } from "@homarr/widgets/activity";

import { projectSmartContainerState } from "./smart-container-layout";

it("shares a tight row budget between active widgets and keeps the quiet widget compact", () => {
  const now = 1_000;
  const ready = (count: number, requestedRows: number): WidgetActivity => ({
    count,
    requestedRows,
    updatedAt: now,
    status: "ready",
    freshForMs: 1_000,
  });
  const state = smartContainerStateSchema.parse({ id: "services", itemIds: ["downloads", "requests", "playback"] });
  const result = projectSmartContainerState({
    state,
    items: state.itemIds.map((id) => ({ id, xOffset: 0, yOffset: 0, width: 4, height: 2 })),
    columnCount: 4,
    rowBudget: 5,
    options: smartContainerOptionsSchema.parse({ reclaimSpace: false }),
    authored: false,
    expandedItemId: null,
    activities: { downloads: ready(8, 5), requests: ready(4, 3), playback: ready(0, 1) },
    now,
  });

  expect(result.rowCount).toBe(5);
  expect([...result.placements.values()].map(({ y, h }) => ({ row: y, height: h }))).toEqual([
    { row: 0, height: 2 },
    { row: 2, height: 2 },
    { row: 4, height: 1 },
  ]);
});
