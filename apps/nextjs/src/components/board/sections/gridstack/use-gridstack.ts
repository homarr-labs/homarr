import type { MutableRefObject, RefObject } from "react";
import { createRef, useCallback, useEffect, useMemo, useRef } from "react";
import { useAtomValue } from "jotai";

import type {
  GridItemHTMLElement,
  GridStack,
  GridStackNode,
} from "@homarr/gridstack";

import {
  useMarkSectionAsReady,
  useRequiredBoard,
} from "~/app/[locale]/boards/_context";
import type { Section } from "~/app/[locale]/boards/_types";
import { editModeAtom } from "../../editMode";
import { useItemActions } from "../../items/item-actions";
import { initializeGridstack } from "./init-gridstack";

export interface UseGridstackRefs {
  wrapper: RefObject<HTMLDivElement>;
  items: MutableRefObject<Record<string, RefObject<GridItemHTMLElement>>>;
  gridstack: MutableRefObject<GridStack | undefined>;
}

interface UseGristackReturnType {
  refs: UseGridstackRefs;
}

interface UseGridstackProps {
  section: Section;
  mainRef?: RefObject<HTMLDivElement>;
}

export const useGridstack = ({
  section,
  mainRef,
}: UseGridstackProps): UseGristackReturnType => {
  const isEditMode = useAtomValue(editModeAtom);
  const markAsReady = useMarkSectionAsReady();
  const { moveAndResizeItem, moveItemToSection } = useItemActions();
  // define reference for wrapper - is used to calculate the width of the wrapper
  const wrapperRef = useRef<HTMLDivElement>(null);
  // references to the diffrent items contained in the gridstack
  const itemRefs = useRef<Record<string, RefObject<GridItemHTMLElement>>>({});
  // reference of the gridstack object for modifications after initialization
  const gridRef = useRef<GridStack>();

  useCssVariableConfiguration({ section, mainRef, gridRef });

  const sectionColumnCount = useSectionColumnCount(section.kind);

  const items = useMemo(() => section.items, [section.items]);

  // define items in itemRefs for easy access and reference to items
  if (Object.keys(itemRefs.current).length !== items.length) {
    items.forEach(({ id }: { id: keyof typeof itemRefs.current }) => {
      itemRefs.current[id] = itemRefs.current[id] ?? createRef();
    });
  }

  useEffect(() => {
    gridRef.current?.setStatic(!isEditMode);
  }, [isEditMode]);

  const onChange = useCallback(
    (changedNode: GridStackNode) => {
      const itemId = changedNode.el?.getAttribute("data-id");
      if (!itemId) return;

      // Updates the react-query state
      moveAndResizeItem({
        itemId,
        xOffset: changedNode.x!,
        yOffset: changedNode.y!,
        width: changedNode.w!,
        height: changedNode.h!,
      });
    },
    [moveAndResizeItem],
  );
  const onAdd = useCallback(
    (addedNode: GridStackNode) => {
      const itemId = addedNode.el?.getAttribute("data-id");
      if (!itemId) return;

      // Updates the react-query state
      moveItemToSection({
        itemId,
        sectionId: section.id,
        xOffset: addedNode.x!,
        yOffset: addedNode.y!,
        width: addedNode.w!,
        height: addedNode.h!,
      });
    },
    [moveItemToSection, section.id],
  );

  useEffect(() => {
    if (!isEditMode) return;
    const currentGrid = gridRef.current;
    // Add listener for moving items around in a wrapper
    currentGrid?.on("change", (_, nodes) => {
      nodes.forEach(onChange);
    });

    // Add listener for moving items in config from one wrapper to another
    currentGrid?.on("added", (_, nodes) => {
      nodes.forEach((node) => onAdd(node));
    });

    return () => {
      currentGrid?.off("change");
      currentGrid?.off("added");
    };
  }, [isEditMode, onAdd, onChange]);

  // initialize the gridstack
  useEffect(() => {
    const isReady = initializeGridstack({
      section,
      refs: {
        items: itemRefs,
        wrapper: wrapperRef,
        gridstack: gridRef,
      },
      sectionColumnCount,
    });

    if (isReady) {
      markAsReady(section.id);
    }

    // Only run this effect when the section items change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, section.items.length]);

  return {
    refs: {
      items: itemRefs,
      wrapper: wrapperRef,
      gridstack: gridRef,
    },
  };
};

/**
 * Get the column count for the section
 * For the sidebar it's always 2 otherwise it's the column count of the board
 * @param sectionKind kind of the section
 * @returns count of columns
 */
const useSectionColumnCount = (sectionKind: Section["kind"]) => {
  const board = useRequiredBoard();
  if (sectionKind === "sidebar") return 2;

  return board.columnCount;
};

interface UseCssVariableConfiguration {
  section: Section;
  mainRef?: RefObject<HTMLDivElement>;
  gridRef: UseGridstackRefs["gridstack"];
}

/**
 * This hook is used to configure the css variables for the gridstack
 * Those css variables are used to define the size of the gridstack items
 * @see gridstack.scss
 * @param section section of the board
 * @param mainRef reference to the main div wrapping all sections
 * @param gridRef reference to the gridstack object
 */
const useCssVariableConfiguration = ({
  section,
  mainRef,
  gridRef,
}: UseCssVariableConfiguration) => {
  const sectionColumnCount = useSectionColumnCount(section.kind);

  // Get reference to the :root element
  const typeofDocument = typeof document;
  const root = useMemo(() => {
    if (typeofDocument === "undefined") return;
    return document.documentElement;
  }, [typeofDocument]);

  // Define widget-width by calculating the width of one column with mainRef width and column count
  useEffect(() => {
    if (section.kind === "sidebar" || !mainRef?.current) return;
    const widgetWidth = mainRef.current.clientWidth / sectionColumnCount;
    // widget width is used to define sizes of gridstack items within global.scss
    root?.style.setProperty("--gridstack-widget-width", widgetWidth.toString());
    console.log("widgetWidth", widgetWidth);
    console.log(gridRef.current);
    gridRef.current?.cellHeight(widgetWidth);
    // gridRef.current is required otherwise the cellheight is run on production as undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionColumnCount, root, section.kind, mainRef, gridRef.current]);

  // Define column count by using the sectionColumnCount
  useEffect(() => {
    root?.style.setProperty(
      "--gridstack-column-count",
      sectionColumnCount.toString(),
    );
  }, [sectionColumnCount, root]);
};
