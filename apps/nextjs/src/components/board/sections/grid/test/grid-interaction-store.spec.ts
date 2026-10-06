import { describe, expect, test, vi } from "vitest";

import { createGridInteractionStore } from "../grid-interaction-store";

describe("grid interaction store", () => {
  test("notifies only source, current target and previous target grids", () => {
    const store = createGridInteractionStore<TestInteraction>();
    const globalListener = vi.fn();
    const sourceListener = vi.fn();
    const firstTargetListener = vi.fn();
    const secondTargetListener = vi.fn();
    const unrelatedListener = vi.fn();

    store.subscribe(globalListener);
    store.subscribeGrid("source", sourceListener);
    store.subscribeGrid("target-a", firstTargetListener);
    store.subscribeGrid("target-b", secondTargetListener);
    store.subscribeGrid("unrelated", unrelatedListener);

    store.publish(createInteraction("target-a", 1));
    expect(sourceListener).toHaveBeenCalledTimes(1);
    expect(firstTargetListener).toHaveBeenCalledTimes(1);
    expect(secondTargetListener).not.toHaveBeenCalled();
    expect(unrelatedListener).not.toHaveBeenCalled();
    expect(store.getGridSnapshot("target-a")?.previewRevision).toBe(1);

    store.publish(createInteraction("target-b", 2));
    expect(sourceListener).toHaveBeenCalledTimes(2);
    expect(firstTargetListener).toHaveBeenCalledTimes(2);
    expect(secondTargetListener).toHaveBeenCalledTimes(1);
    expect(unrelatedListener).not.toHaveBeenCalled();
    expect(store.getGridSnapshot("target-a")).toBeNull();
    expect(store.getGridSnapshot("target-b")?.previewRevision).toBe(2);

    store.publish(null);
    expect(sourceListener).toHaveBeenCalledTimes(3);
    expect(firstTargetListener).toHaveBeenCalledTimes(2);
    expect(secondTargetListener).toHaveBeenCalledTimes(2);
    expect(unrelatedListener).not.toHaveBeenCalled();
    expect(globalListener).toHaveBeenCalledTimes(3);
  });
});

interface TestInteraction {
  sourceGridId: "source";
  targetGridId: string;
  previewRevision: number;
}

const createInteraction = (targetGridId: string, previewRevision: number): TestInteraction => ({
  sourceGridId: "source",
  targetGridId,
  previewRevision,
});
