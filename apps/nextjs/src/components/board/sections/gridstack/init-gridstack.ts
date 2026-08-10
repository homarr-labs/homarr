import type { RefObject } from "react";

import type { GridItemHTMLElement } from "@homarr/gridstack";
import { GridStack } from "@homarr/gridstack";

import type { Section } from "~/app/[locale]/boards/_types";

interface InitializeGridstackProps {
  section: Omit<Section, "items">;
  itemIds: string[];
  refs: {
    wrapper: RefObject<HTMLDivElement | null>;
    items: RefObject<Record<string, RefObject<GridItemHTMLElement | null>>>;
    gridstack: RefObject<GridStack | null>;
  };
  sectionColumnCount: number;
}

export const initializeGridstack = ({ section, itemIds, refs, sectionColumnCount }: InitializeGridstackProps) => {
  if (!refs.wrapper.current) return false;
  // initialize gridstack
  const newGrid = refs.gridstack;
  const isDynamic = section.kind === "dynamic";
  const isScrollable = isDynamic && "options" in section && section.options.scrollable;
  // Scrollable dynamic sections aren't limited to the visible section height,
  // so items can be placed below the fold and reached by scrolling.
  const maxRow = isDynamic && "height" in section && !isScrollable ? (section.height as number) : 0;
  newGrid.current = GridStack.init(
    {
      column: sectionColumnCount,
      margin: 10,
      cellHeight: 128,
      float: true,
      alwaysShowResizeHandle: true,
      acceptWidgets: true,
      staticGrid: true,
      minRow: isDynamic && "height" in section ? (section.height as number) : 1,
      maxRow,
      animate: false,
      styleInHead: true,
      disableRemoveNodeOnDrop: true,
    },
    // selector of the gridstack item (it's eather category or wrapper)
    `.grid-stack-${section.kind}[data-section-id='${section.id}']`,
  );
  const grid = newGrid.current;

  // GridStack.init() reuses the cached instance for an already-initialized element and
  // silently ignores the new options object above -- including maxRow. Its engine also keeps
  // its own separate copy of maxRow (set once when first constructed) that collision/accept
  // checks actually read, so it has to be synced explicitly here too, not just on grid.opts.
  grid.opts.maxRow = maxRow;
  if (grid.engine) grid.engine.maxRow = maxRow;

  grid.batchUpdate();
  grid.removeAll(false);
  itemIds.forEach((id) => {
    const ref = refs.items.current[id]?.current;
    if (!ref) return;

    grid.makeWidget(ref);
  });
  grid.batchUpdate(false);

  // Must be used to update the column count after the initialization. Has to run after the
  // removeAll/makeWidget rebuild above, not before: calling it first works when checked in
  // isolation, but makeWidget re-registers each item from its DOM ref right afterward and
  // does not preserve that reflow, undoing it and leaving items overlapping.
  // A dynamic section's column count changes continuously as its outer box is resized
  // (unlike other sections, which only change column count between board layouts that
  // already store their own explicit item positions), so its items need to be reflowed
  // to fit the new column count instead of keeping their old, now out-of-bounds offsets.
  // "list" re-adds each item with auto-placement (in original order), so GridStack's own
  // collision handling finds each one a clear slot -- "move"/"moveScale" assign explicit
  // positions directly, which can make that collision pass thrash and leave items overlapping.
  grid.column(sectionColumnCount, isDynamic ? "list" : "none");

  return true;
};
