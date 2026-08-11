import { act, createElement, memo } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { DndGridEntryProps } from "../grid-entry-memo";
import { areDndGridEntryPropsEqual } from "../grid-entry-memo";
import { createGridPreviewDomState, syncGridPreviewGeometry } from "../grid-preview-geometry";

describe("grid entry memoization", () => {
  let container: HTMLDivElement;
  let root: Root;
  let renders = 0;
  let widgetRenders = 0;

  const Probe = memo((props: DndGridEntryProps) => {
    renders += 1;
    return createElement(
      "span",
      {
        "data-grid-id": props.placement.id,
        "data-x": props.placement.x,
        ref: (element: HTMLSpanElement | null) => props.registerElement(props.placement.id, element),
      },
      createElement(WidgetProbe),
    );
  }, areDndGridEntryPropsEqual);
  const WidgetProbe = () => {
    widgetRenders += 1;
    return null;
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renders = 0;
    widgetRenders = 0;
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

  test("keeps 100 entry and widget renders frozen while preview geometry changes", () => {
    const elements = new Map<string, HTMLElement>();
    const registerElement = (id: string, element: HTMLElement | null) => {
      if (element) elements.set(id, element);
      else elements.delete(id);
    };
    const entries = Array.from({ length: 100 }, (_, index) => ({
      ...createProps(),
      registerElement,
      placement: { ...createProps().placement, id: `item-${index}`, x: index % 10, y: Math.floor(index / 10) },
    }));
    renderBoard(entries);
    expect(renders).toBe(100);
    expect(widgetRenders).toBe(100);

    let previewState = createGridPreviewDomState();
    for (let revision = 1; revision <= 20; revision += 1) {
      previewState = syncGridPreviewGeometry({
        elements,
        placements: entries.map((entry) => entry.placement),
        previewPlacements: entries.map((entry, index) =>
          index === 42 ? { ...entry.placement, y: entry.placement.y + revision } : entry.placement,
        ),
        activeId: "item-0",
        mode: "drag",
        previous: previewState,
      });
    }

    expect(renders).toBe(100);
    expect(widgetRenders).toBe(100);
    expect(elements.get("item-42")?.getAttribute("data-grid-preview")).toBe("true");

    renderBoard(
      entries.map((entry, index) =>
        index === 42 ? { ...entry, placement: { ...entry.placement, y: entry.placement.y + 20 } } : entry,
      ),
    );
    expect(renders).toBe(101);
    expect(widgetRenders).toBe(101);
  });

  test.each([
    ["label", (props: DndGridEntryProps) => ({ ...props, label: "Changed" })],
    ["grid limits", (props: DndGridEntryProps) => ({ ...props, maxRowCount: 10 })],
    ["element registration", (props: DndGridEntryProps) => ({ ...props, registerElement: () => undefined })],
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
  registerElement: () => undefined,
});
