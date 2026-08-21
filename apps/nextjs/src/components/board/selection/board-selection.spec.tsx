// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Board } from "~/app/[locale]/boards/_types";
import { BoardMockBuilder } from "~/components/board/items/actions/test/mocks/board-mock";
import { ContainerSectionMockBuilder } from "~/components/board/items/actions/test/mocks/container-section-mock";
import { EmptySectionMockBuilder } from "~/components/board/items/actions/test/mocks/empty-section-mock";
import { ItemMockBuilder } from "~/components/board/items/actions/test/mocks/item-mock";
import { LayoutMockBuilder } from "~/components/board/items/actions/test/mocks/layout-mock";
import { BoardSelectionProvider, useBoardSelection } from "./board-selection-context";

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => key,
}));

vi.mock("../audio/board-sounds", () => ({
  playPopSound: vi.fn(),
  playTrashSound: vi.fn(),
}));

let currentBoardState: Board;
let mockUpdateBoard: (updater: (prev: Board) => Board) => void;

vi.mock("@homarr/boards/context", () => ({
  useRequiredBoard: () => currentBoardState,
  useCurrentLayout: () => "layout-1",
}));

vi.mock("@homarr/boards/edit-mode", () => ({
  useEditMode: () => [true, vi.fn()],
}));

vi.mock("@homarr/boards/updater", () => ({
  usePersistBoard: () => ({
    updateAndPersistBoard: (updater: (prev: Board) => Board) => {
      mockUpdateBoard(updater);
    },
  }),
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

const SelectionConsumer = ({ onReady }: { onReady: (ctx: ReturnType<typeof useBoardSelection>) => void }) => {
  const selection = useBoardSelection();
  onReady(selection);
  return <div>Selection Ready</div>;
};

describe("BoardSelectionContext", () => {
  it("toggles item selection and clears on clearSelection", async () => {
    const layout = new LayoutMockBuilder({ id: "layout-1" }).build();
    const item1 = new ItemMockBuilder({ id: "item-1" }).addLayout({ layoutId: "layout-1" }).build();
    currentBoardState = new BoardMockBuilder().addLayout(layout).addItem(item1).build();
    mockUpdateBoard = vi.fn();

    let selectionContext!: ReturnType<typeof useBoardSelection>;

    await act(async () => {
      root.render(
        <MantineProvider>
          <BoardSelectionProvider>
            <SelectionConsumer
              onReady={(ctx) => {
                selectionContext = ctx;
              }}
            />
          </BoardSelectionProvider>
        </MantineProvider>,
      );
    });

    expect(selectionContext.isSelected("item-1")).toBe(false);

    await act(async () => {
      selectionContext.toggleSelectItem("item-1");
    });
    expect(selectionContext.isSelected("item-1")).toBe(true);

    await act(async () => {
      selectionContext.clearSelection();
    });
    expect(selectionContext.isSelected("item-1")).toBe(false);
  });

  it("moves selected items to the first available positions in a container section", async () => {
    const layout = new LayoutMockBuilder({ id: "layout-1" }).build();
    const emptyRoot = new EmptySectionMockBuilder({ id: "empty-root", xOffset: 0 }).build();
    const container = new ContainerSectionMockBuilder({ id: "container-1" })
      .addLayout({ layoutId: "layout-1", parentSectionId: "empty-root", width: 4, height: 4 })
      .build();

    // Existing item inside the container at (0, 0) with 2x2
    const existingContainerItem = new ItemMockBuilder({ id: "existing-1" })
      .addLayout({ layoutId: "layout-1", sectionId: "container-1", xOffset: 0, yOffset: 0, width: 2, height: 2 })
      .build();

    // Two items to move from emptyRoot
    const itemA = new ItemMockBuilder({ id: "item-a" })
      .addLayout({ layoutId: "layout-1", sectionId: "empty-root", xOffset: 5, yOffset: 5, width: 2, height: 1 })
      .build();
    const itemB = new ItemMockBuilder({ id: "item-b" })
      .addLayout({ layoutId: "layout-1", sectionId: "empty-root", xOffset: 8, yOffset: 8, width: 2, height: 1 })
      .build();

    currentBoardState = new BoardMockBuilder()
      .addLayout(layout)
      .addSection(emptyRoot)
      .addSection(container)
      .addItem(existingContainerItem)
      .addItem(itemA)
      .addItem(itemB)
      .build();

    let updatedBoard: Board = currentBoardState;
    mockUpdateBoard = vi.fn((updater) => {
      updatedBoard = updater(currentBoardState);
      currentBoardState = updatedBoard;
    });

    let selectionContext!: ReturnType<typeof useBoardSelection>;

    await act(async () => {
      root.render(
        <MantineProvider>
          <BoardSelectionProvider>
            <SelectionConsumer
              onReady={(ctx) => {
                selectionContext = ctx;
              }}
            />
          </BoardSelectionProvider>
        </MantineProvider>,
      );
    });

    await act(async () => {
      selectionContext.toggleSelectItem("item-a");
      selectionContext.toggleSelectItem("item-b");
    });

    await act(async () => {
      selectionContext.moveSelectedItemsToSection("container-1");
    });

    const movedA = updatedBoard.items.find((i) => i.id === "item-a")?.layouts.find((l) => l.layoutId === "layout-1");
    const movedB = updatedBoard.items.find((i) => i.id === "item-b")?.layouts.find((l) => l.layoutId === "layout-1");

    expect(movedA?.sectionId).toBe("container-1");
    expect(movedB?.sectionId).toBe("container-1");

    // Container width is 4. Existing item at (0, 0) occupies (0,0)-(1,1).
    // itemA (2x1) is placed at first empty spot: (2, 0)
    expect(movedA?.xOffset).toBe(2);
    expect(movedA?.yOffset).toBe(0);

    // itemB (2x1) is placed at next first empty spot: (2, 1)
    expect(movedB?.xOffset).toBe(2);
    expect(movedB?.yOffset).toBe(1);
  });

  it("keeps the entire selection in place when the destination cannot fit every item", async () => {
    const layout = new LayoutMockBuilder({ id: "layout-1" }).build();
    const emptyRoot = new EmptySectionMockBuilder({ id: "empty-root", xOffset: 0 }).build();
    const container = new ContainerSectionMockBuilder({ id: "container-1" })
      .addLayout({ layoutId: "layout-1", parentSectionId: "empty-root", width: 2, height: 1 })
      .build();
    const existingContainerItem = new ItemMockBuilder({ id: "existing-1" })
      .addLayout({ layoutId: "layout-1", sectionId: "container-1", xOffset: 0, yOffset: 0, width: 1, height: 1 })
      .build();
    const itemA = new ItemMockBuilder({ id: "item-a" })
      .addLayout({ layoutId: "layout-1", sectionId: "empty-root", xOffset: 0, yOffset: 0, width: 1, height: 1 })
      .build();
    const itemB = new ItemMockBuilder({ id: "item-b" })
      .addLayout({ layoutId: "layout-1", sectionId: "empty-root", xOffset: 1, yOffset: 0, width: 1, height: 1 })
      .build();

    currentBoardState = new BoardMockBuilder()
      .addLayout(layout)
      .addSection(emptyRoot)
      .addSection(container)
      .addItem(existingContainerItem)
      .addItem(itemA)
      .addItem(itemB)
      .build();

    let updatedBoard = currentBoardState;
    mockUpdateBoard = vi.fn((updater) => {
      updatedBoard = updater(currentBoardState);
      currentBoardState = updatedBoard;
    });

    let selectionContext!: ReturnType<typeof useBoardSelection>;
    await act(async () => {
      root.render(
        <MantineProvider>
          <BoardSelectionProvider>
            <SelectionConsumer
              onReady={(ctx) => {
                selectionContext = ctx;
              }}
            />
          </BoardSelectionProvider>
        </MantineProvider>,
      );
    });

    await act(async () => {
      selectionContext.toggleSelectItem("item-a");
      selectionContext.toggleSelectItem("item-b");
    });
    await act(async () => {
      selectionContext.moveSelectedItemsToSection("container-1");
    });

    expect(updatedBoard.items.find((item) => item.id === "item-a")?.layouts[0]?.sectionId).toBe("empty-root");
    expect(updatedBoard.items.find((item) => item.id === "item-b")?.layouts[0]?.sectionId).toBe("empty-root");
    expect(selectionContext.isSelected("item-a")).toBe(true);
    expect(selectionContext.isSelected("item-b")).toBe(true);
  });
});
