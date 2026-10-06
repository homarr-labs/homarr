import { act, createElement } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCollapsedDisplayLayout, getLogicalGridSize } from "../../../layout";
import { FixedGridItem } from "../fixed-grid-item";

const mocks = vi.hoisted(() => ({
  announce: vi.fn(),
  commitSectionGrid: vi.fn(),
  isSelected: vi.fn(() => false),
  toggleSelectItem: vi.fn(),
  registerElement: vi.fn(),
  editMode: true,
  maxRowCount: null as number | null,
  items: [
    {
      id: "weather",
      type: "item" as const,
      kind: "weather" as const,
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 1,
      advancedOptions: {
        title: null as string | null,
      },
    },
    {
      id: "clock",
      type: "item" as const,
      kind: "clock" as const,
      xOffset: 1,
      yOffset: 0,
      width: 1,
      height: 1,
      advancedOptions: {
        title: null as string | null,
      },
    },
  ],
}));

vi.mock("@homarr/boards/edit-mode", () => ({
  useEditMode: () => [mocks.editMode],
}));

vi.mock("~/components/board/selection/board-selection-context", () => ({
  useBoardSelection: () => ({
    isSelected: mocks.isSelected,
    toggleSelectItem: mocks.toggleSelectItem,
  }),
}));

vi.mock("@homarr/boards/context", () => ({
  useCurrentLayout: () => "layout",
}));

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string, values?: Record<string, string>) =>
    key === "item.moveResize.entryLabel" ? `${values?.name}, column ${values?.column}, row ${values?.row}` : key,
}));

vi.mock("../use-grid-layout-actions", () => ({
  useGridLayoutActions: () => ({
    commitSectionGrid: mocks.commitSectionGrid,
  }),
}));

vi.mock("../grid-editor-runtime", () => ({
  useGridEditorRuntimeStatus: () => "ready",
}));

vi.mock("../../section-context", () => ({
  useSectionContext: () => ({
    section: { id: "root", kind: "empty", options: {} },
    items: mocks.items,
    innerSections: [],
    columnCount: 3,
    maxRowCount: mocks.maxRowCount,
    placements: mocks.items.map((item) => ({
      id: item.id,
      type: item.type,
      x: item.xOffset,
      y: item.yOffset,
      w: item.width,
      h: item.height,
    })),
    interactionDisabled: false,
    announce: mocks.announce,
    entryElementStore: { register: mocks.registerElement },
  }),
}));

vi.mock("@mantine/core", async () => {
  const React = await import("react");

  return {
    Box: ({ children, ...props }: { children?: ReactNode }) => React.createElement("div", props, children),
  };
});

describe("fixed grid item behavior", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.announce.mockReset();
    mocks.commitSectionGrid.mockReset();
    mocks.registerElement.mockReset();
    mocks.editMode = true;
    mocks.maxRowCount = null;
    getWeatherMock().advancedOptions.title = null;
    getClockMock().xOffset = 1;
    getClockMock().yOffset = 0;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("moves with the keyboard and swaps an equal-sized destination", () => {
    renderWeather(root);

    const entry = getEditorEntry(container);
    startKeyboardEditing(entry);
    act(() => entry.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));

    expect(mocks.commitSectionGrid).toHaveBeenCalledWith({
      layoutId: "layout",
      sectionId: "root",
      placements: [
        { id: "weather", type: "item", x: 1, y: 0, w: 1, h: 1 },
        { id: "clock", type: "item", x: 0, y: 0, w: 1, h: 1 },
      ],
    });
    expect(mocks.announce).toHaveBeenCalledTimes(2);
  });

  test("uses shift plus an arrow to resize while honoring grid bounds", () => {
    renderWeather(root);

    const entry = getEditorEntry(container);
    startKeyboardEditing(entry);
    act(() =>
      entry.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          shiftKey: true,
          bubbles: true,
        }),
      ),
    );

    expect(mocks.commitSectionGrid).toHaveBeenCalledWith({
      layoutId: "layout",
      sectionId: "root",
      placements: [
        { id: "weather", type: "item", x: 0, y: 0, w: 2, h: 1 },
        { id: "clock", type: "item", x: 1, y: 1, w: 1, h: 1 },
      ],
    });

    mocks.commitSectionGrid.mockReset();
    act(() =>
      entry.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowLeft",
          shiftKey: true,
          bubbles: true,
        }),
      ),
    );
    expect(mocks.commitSectionGrid).toHaveBeenCalledWith({
      layoutId: "layout",
      sectionId: "root",
      placements: [
        { id: "weather", type: "item", x: 0, y: 0, w: 1, h: 1 },
        { id: "clock", type: "item", x: 1, y: 1, w: 1, h: 1 },
      ],
    });

    mocks.commitSectionGrid.mockReset();
    act(() =>
      entry.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowLeft",
          shiftKey: true,
          bubbles: true,
        }),
      ),
    );
    expect(mocks.commitSectionGrid).not.toHaveBeenCalled();
    expect(mocks.announce).toHaveBeenLastCalledWith(
      "widget.weather.name, column 1, row 1: item.moveResize.keyboard.boundary",
    );
  });

  test("applies repeated keyboard resizes before board props rerender", () => {
    renderWeather(root);

    const entry = getEditorEntry(container);
    startKeyboardEditing(entry);
    act(() => {
      entry.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true }));
      entry.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true }));
    });

    expect(mocks.commitSectionGrid).toHaveBeenCalledTimes(2);
    expect(mocks.commitSectionGrid).toHaveBeenLastCalledWith({
      layoutId: "layout",
      sectionId: "root",
      placements: [
        { id: "weather", type: "item", x: 0, y: 0, w: 1, h: 3 },
        { id: "clock", type: "item", x: 1, y: 0, w: 1, h: 1 },
      ],
    });
  });

  test("stops keyboard editing when the rendered grid state is invalid", () => {
    getClockMock().xOffset = 0;
    renderWeather(root);

    const entry = getEditorEntry(container);
    startKeyboardEditing(entry);
    act(() => entry.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));

    expect(entry.dataset.keyboardEditing).toBe("false");
    expect(mocks.commitSectionGrid).not.toHaveBeenCalled();
    expect(mocks.announce).toHaveBeenLastCalledWith(
      "widget.weather.name, column 1, row 1: item.moveResize.keyboard.stopped",
    );
  });

  test("uses the whole tile as the focusable move surface without extra drag chrome", () => {
    getWeatherMock().advancedOptions.title = "  Balcony forecast  ";
    renderWeather(root);

    const entry = getEditorEntry(container);

    expect(entry.getAttribute("aria-label")).toBe("Balcony forecast, column 1, row 1");
    expect(entry.tabIndex).toBe(0);
    expect(entry.getAttribute("aria-describedby")).not.toBeNull();
    expect(container.querySelector('[data-testid="board-grid-drag-affordance"]')).toBeNull();
  });

  test("renders a view-only 1x1 card at the complete grid footprint", () => {
    mocks.editMode = false;
    renderWeather(root);

    const item = container.querySelector<HTMLElement>('[data-grid-id="weather"]');
    expect(item).not.toBeNull();
    expect(item?.style.width).toBe(`${getLogicalGridSize(1)}px`);
    expect(item?.style.height).toBe(`${getLogicalGridSize(1)}px`);
    expect(item?.getAttribute("role")).toBeNull();

    act(() => item?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(mocks.commitSectionGrid).not.toHaveBeenCalled();
  });

  test("does not move or resize beyond a fixed section row boundary", () => {
    mocks.maxRowCount = 1;
    renderWeather(root);

    const entry = getEditorEntry(container);
    startKeyboardEditing(entry);
    act(() => entry.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    act(() => entry.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true })));

    expect(mocks.commitSectionGrid).not.toHaveBeenCalled();
    expect(mocks.announce).toHaveBeenNthCalledWith(
      2,
      "widget.weather.name, column 1, row 1: item.moveResize.keyboard.boundary",
    );
    expect(mocks.announce).toHaveBeenNthCalledWith(
      3,
      "widget.weather.name, column 1, row 1: item.moveResize.keyboard.boundary",
    );
  });

  test("collapsing an expanded box changes display geometry without mutating persisted placement", () => {
    const persisted = [
      { id: "box", type: "section" as const, x: 0, y: 0, w: 2, h: 4 },
      { id: "app", type: "item" as const, x: 0, y: 4, w: 1, h: 1 },
    ];

    const displayed = getCollapsedDisplayLayout(persisted, {
      columnCount: 2,
      collapsedItemIds: new Set(["box"]),
    });

    expect(displayed).toEqual([
      { ...persisted[0], h: 0.5 },
      { ...persisted[1], y: 0.5 },
    ]);
    expect(persisted[0]?.h).toBe(4);
    expect(persisted[1]?.y).toBe(4);
  });
});

const renderWeather = (root: Root) => {
  act(() => {
    root.render(
      createElement(
        FixedGridItem,
        {
          item: getWeatherMock() as never,
        },
        createElement("span", null, "Weather"),
      ),
    );
  });
};

const getWeatherMock = () => {
  const item = mocks.items[0];
  if (!item) throw new Error("Expected the weather item mock to exist");
  return item;
};

const getClockMock = () => {
  const item = mocks.items[1];
  if (!item) throw new Error("Expected the clock item mock to exist");
  return item;
};

const getEditorEntry = (container: HTMLElement) => {
  const entry = container.querySelector<HTMLDivElement>("[data-editor-grid-entry]");
  if (!entry) throw new Error("Expected the fixed grid item to render an editor entry");

  return entry;
};

const startKeyboardEditing = (entry: HTMLDivElement) => {
  act(() => entry.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
};
