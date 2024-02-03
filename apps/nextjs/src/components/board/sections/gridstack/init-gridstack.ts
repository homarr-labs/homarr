import type { MutableRefObject, RefObject } from "react";

import type { GridItemHTMLElement } from "@homarr/gridstack";
import { GridStack } from "@homarr/gridstack";

import type { Section } from "~/app/[locale]/boards/_types";

interface InitializeGridstackProps {
  section: Section;
  refs: {
    wrapper: RefObject<HTMLDivElement>;
    items: MutableRefObject<Record<string, RefObject<GridItemHTMLElement>>>;
    gridstack: MutableRefObject<GridStack | undefined>;
  };
  sectionColumnCount: number;
}

export const initializeGridstack = ({
  section,
  refs,
  sectionColumnCount,
}: InitializeGridstackProps) => {
  if (!refs.wrapper.current) return false;
  // calculates the currently available count of columns
  const columnCount = section.kind === "sidebar" ? 2 : sectionColumnCount;
  const minRow =
    section.kind !== "sidebar"
      ? 1
      : Math.floor(refs.wrapper.current.offsetHeight / 128);
  // initialize gridstack
  const newGrid = refs.gridstack;
  newGrid.current = GridStack.init(
    {
      column: columnCount,
      margin: section.kind === "sidebar" ? 5 : 10,
      cellHeight: 128,
      float: true,
      alwaysShowResizeHandle: true,
      acceptWidgets: true,
      staticGrid: true,
      minRow,
      animate: false,
      styleInHead: true,
      disableRemoveNodeOnDrop: true,
    },
    // selector of the gridstack item (it's eather category or wrapper)
    `.grid-stack-${section.kind}[data-section-id='${section.id}']`,
  );
  const grid = newGrid.current;
  if (!grid) return false;
  // Must be used to update the column count after the initialization
  grid.column(columnCount, "none");

  grid.batchUpdate();
  grid.removeAll(false);
  section.items.forEach(({ id }) => {
    const ref = refs.items.current[id]?.current;
    ref && grid.makeWidget(ref);
  });
  grid.batchUpdate(false);
  return true;
};
