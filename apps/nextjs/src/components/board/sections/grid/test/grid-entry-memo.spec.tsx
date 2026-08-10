import { act, createElement, memo } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { DndGridEntryProps } from "../grid-entry-memo";
import { areDndGridEntryPropsEqual } from "../grid-entry-memo";

describe("grid entry memoization", () => {
  let container: HTMLDivElement;
  let root: Root;
  let renders: number;

  const Probe = memo((props: DndGridEntryProps) => {
    renders += 1;
    return createElement("span", { "data-x": props.placement.x });
  }, areDndGridEntryPropsEqual);

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renders = 0;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("skips cloned unchanged preview placements and renders changed entries", () => {
    const props = createProps();

    render(props);
    expect(renders).toBe(1);

    render({ ...props, placement: { ...props.placement } });
    expect(renders).toBe(1);

    render({ ...props, placement: { ...props.placement, x: 2 } });
    expect(renders).toBe(2);
  });

  test("rerenders only the changed entry on a 100 item preview", () => {
    const entries = Array.from({ length: 100 }, (_, index) => ({
      ...createProps(),
      placement: { ...createProps().placement, id: `item-${index}`, x: index % 10, y: Math.floor(index / 10) },
    }));

    renderBoard(entries);
    expect(renders).toBe(100);

    renderBoard(entries.map((entry) => ({ ...entry, placement: { ...entry.placement } })));
    expect(renders).toBe(100);

    renderBoard(
      entries.map((entry, index) =>
        index === 42 ? { ...entry, placement: { ...entry.placement, y: entry.placement.y + 1 } } : entry,
      ),
    );
    expect(renders).toBe(101);
  });

  test.each([
    ["active state", (props: DndGridEntryProps) => ({ ...props, isActive: true })],
    ["label", (props: DndGridEntryProps) => ({ ...props, label: "Changed" })],
    ["grid limits", (props: DndGridEntryProps) => ({ ...props, maxRowCount: 10 })],
    [
      "minimum size",
      (props: DndGridEntryProps) => ({
        ...props,
        placement: { ...props.placement, minW: 2 },
      }),
    ],
  ])("renders when %s changes", (_name, update) => {
    const props = createProps();
    render(props);
    render(update(props));
    expect(renders).toBe(2);
  });

  const render = (props: DndGridEntryProps) => {
    act(() => root.render(createElement(Probe, props)));
  };

  const renderBoard = (entries: DndGridEntryProps[]) => {
    act(() =>
      root.render(
        createElement(
          "div",
          null,
          entries.map((entry) => createElement(Probe, { ...entry, key: entry.placement.id })),
        ),
      ),
    );
  };
});

const createProps = (): DndGridEntryProps => ({
  sectionId: "root",
  placement: { id: "weather", type: "item", x: 0, y: 0, w: 1, h: 1 },
  label: "Weather",
  columnCount: 12,
  maxRowCount: null,
  isActive: false,
});
