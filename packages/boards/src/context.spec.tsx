import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isEditMode: false,
  cancel: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/boards/home",
}));

vi.mock("./edit-mode", () => ({
  useEditMode: () => [mocks.isEditMode, { open: vi.fn(), close: vi.fn() }],
}));

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    useUtils: () => ({
      board: {
        getBoardByName: {
          cancel: mocks.cancel,
          invalidate: mocks.invalidate,
        },
      },
    }),
    board: {
      getBoardByName: {
        useQuery: (input: { name: string }) => ({ data: { name: input.name, layouts: [{ id: "base" }] } }),
      },
    },
  },
}));

import { BoardProvider } from "./context";

describe("BoardProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderBoard = () =>
    act(() => {
      root.render(
        createElement(
          BoardProvider,
          {
            initialBoard: { name: "home", layouts: [{ id: "base" }] } as never,
            initialLayoutId: "base",
            initialViewportWidth: 1280,
          },
          createElement("span", null, "board"),
        ),
      );
    });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.isEditMode = false;
    mocks.cancel.mockClear();
    mocks.invalidate.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("cancels an in-flight board refetch when edit mode turns on", async () => {
    renderBoard();
    expect(mocks.cancel).not.toHaveBeenCalled();

    mocks.isEditMode = true;
    renderBoard();

    expect(mocks.cancel).toHaveBeenCalledWith({ name: "home" });
  });

  test("does not cancel while edit mode stays off", async () => {
    renderBoard();
    renderBoard();

    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
