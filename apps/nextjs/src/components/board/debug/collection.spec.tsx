import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";

import { collectBoardSnapshotState, useBoardSnapshotState } from "@homarr/api/board-snapshot";

const Widget = ({ month }: { month: number }) => {
  useBoardSnapshotState(["board-debug-calendar", "synthetic-item"], { month, year: 2026 });
  return null;
};

it("reads the latest mounted widget state only on explicit capture and removes unmounted collectors", async () => {
  const element = document.createElement("div");
  const root = createRoot(element);
  const reactEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previous = reactEnvironment.IS_REACT_ACT_ENVIRONMENT;
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    expect(collectBoardSnapshotState()).toEqual([]);
    await act(() => root.render(createElement(Widget, { month: 2 })));
    await act(() => root.render(createElement(Widget, { month: 8 })));
    expect(collectBoardSnapshotState()).toEqual([
      { key: ["board-debug-calendar", "synthetic-item"], data: { month: 8, year: 2026 } },
    ]);
  } finally {
    await act(() => root.unmount());
    reactEnvironment.IS_REACT_ACT_ENVIRONMENT = previous;
  }
  expect(collectBoardSnapshotState()).toEqual([]);
});
