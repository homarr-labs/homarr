import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import type { Root } from "react-dom/client";
import type { DataTableColumn } from "mantine-datatable";

const tableState = vi.hoisted(() => ({
  columnsOrder: ["name", "state"],
  columnsWidth: [] as Record<string, string | number>[],
}));

vi.mock("mantine-datatable", () => ({
  useDataTableColumns: ({ columns }: { columns: DataTableColumn<unknown>[] }) => ({
    effectiveColumns: columns,
    columnsOrder: tableState.columnsOrder,
    columnsWidth: tableState.columnsWidth,
    setColumnsOrder: vi.fn(),
    setMultipleColumnWidths: vi.fn(),
  }),
}));

import { usePersistedTableLayout } from "./use-persisted-table-layout";

const columns: DataTableColumn<{ name: string; state: string }>[] = [{ accessor: "name" }, { accessor: "state" }];
const columnAccessors = ["name", "state"] as const;

const LayoutHarness = ({ itemId, onLayoutChange }: { itemId: string; onLayoutChange: (layout: unknown) => void }) => {
  usePersistedTableLayout({
    columns,
    columnAccessors,
    columnOrder: "",
    columnWidths: "",
    itemId,
    storeKeyPrefix: "test-table",
    onLayoutChange,
    isEditMode: true,
  });
  return null;
};

describe("usePersistedTableLayout", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, writable: true });
  });

  beforeEach(() => {
    vi.useFakeTimers();
    tableState.columnsOrder = ["name", "state"];
    tableState.columnsWidth = [];
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.useRealTimers();
  });

  test("flushes a pending layout through the callback for its originating item", async () => {
    const firstItemLayoutChange = vi.fn();
    const secondItemLayoutChange = vi.fn();

    await act(async () => {
      root.render(createElement(LayoutHarness, { itemId: "first", onLayoutChange: firstItemLayoutChange }));
    });

    tableState.columnsOrder = ["state", "name"];
    await act(async () => {
      root.render(createElement(LayoutHarness, { itemId: "first", onLayoutChange: firstItemLayoutChange }));
    });
    expect(firstItemLayoutChange).not.toHaveBeenCalled();

    await act(async () => {
      root.render(createElement(LayoutHarness, { itemId: "second", onLayoutChange: secondItemLayoutChange }));
    });

    expect(firstItemLayoutChange).toHaveBeenCalledWith({ columnOrder: JSON.stringify(["state", "name"]) });
    expect(secondItemLayoutChange).not.toHaveBeenCalled();
  });
});
