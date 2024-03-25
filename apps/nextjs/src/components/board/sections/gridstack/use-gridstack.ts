import type { MutableRefObject, RefObject } from "react";
import { createRef, useCallback, useEffect, useMemo, useRef } from "react";
import { useElementSize, useWindowEvent } from "@mantine/hooks";
import { atom, useAtom, useAtomValue } from "jotai";

import type {
  GridItemHTMLElement,
  GridStack,
  GridStackNode,
} from "@homarr/gridstack";

import { useMarkSectionAsReady } from "~/app/[locale]/boards/_context";
import type { Section } from "~/app/[locale]/boards/_types";
import { editModeAtom } from "../../editMode";
import { useItemActions } from "../../items/item-actions";
import { useSectionActions } from "../section-actions";
import { initializeGridstack } from "./init-gridstack";

export const selectedItemAtom = atom<string | null>(null);

export interface UseGridstackRefs {
  wrapper: RefObject<HTMLDivElement>;
  items: MutableRefObject<Record<string, RefObject<GridItemHTMLElement>>>;
  gridstack: MutableRefObject<GridStack | undefined>;
}

interface UseGristackReturnType {
  refs: UseGridstackRefs;
}

interface UseGridstackProps {
  section: Omit<Section, "items">;
  items: { id: string }[];
}

export const useGridstack = ({
  section,
  items,
}: UseGridstackProps): UseGristackReturnType => {
  const isEditMode = useAtomValue(editModeAtom);
  const markAsReady = useMarkSectionAsReady();
  const { moveAndResizeItem, moveItemToSection } = useItemActions();
  const { moveAndResizeSection, moveSectionToSection } = useSectionActions();
  // define reference for wrapper - is used to calculate the width of the wrapper
  const { ref: wrapperRef, width } = useElementSize<HTMLDivElement>();
  // references to the diffrent items contained in the gridstack
  const itemRefs = useRef<Record<string, RefObject<GridItemHTMLElement>>>({});
  // reference of the gridstack object for modifications after initialization
  const gridRef = useRef<GridStack>();

  useCssVariableConfiguration({
    section,
    gridRef,
    wrapperRef,
    width,
  });

  const memoizedItems = useMemo(() => items, [items]);

  // define items in itemRefs for easy access and reference to items
  if (Object.keys(itemRefs.current).length !== memoizedItems.length) {
    memoizedItems.forEach(({ id }: { id: keyof typeof itemRefs.current }) => {
      itemRefs.current[id] = itemRefs.current[id] ?? createRef();
    });
  }

  useEffect(() => {
    gridRef.current?.setStatic(!isEditMode);
  }, [isEditMode]);

  const onChange = useCallback(
    (changedNode: GridStackNode) => {
      const itemId = changedNode.el?.getAttribute("data-id");
      const type = changedNode.el?.getAttribute("data-type");
      if (!itemId || !type) return;

      if (type === "section") {
        return moveAndResizeSection({
          sectionId: itemId,
          xOffset: changedNode.x!,
          yOffset: changedNode.y!,
          width: changedNode.w!,
          height: changedNode.h!,
        });
      }

      // Updates the react-query state
      moveAndResizeItem({
        itemId,
        xOffset: changedNode.x!,
        yOffset: changedNode.y!,
        width: changedNode.w!,
        height: changedNode.h!,
      });
    },
    [moveAndResizeItem, moveAndResizeSection],
  );
  const onAdd = useCallback(
    (addedNode: GridStackNode) => {
      const itemId = addedNode.el?.getAttribute("data-id");
      const type = addedNode.el?.getAttribute("data-type");
      if (!itemId || !type) return;

      if (type === "section") {
        return moveSectionToSection({
          sectionId: itemId,
          xOffset: addedNode.x!,
          yOffset: addedNode.y!,
          width: addedNode.w!,
          height: addedNode.h!,
          targetSectionId: section.id,
        });
      }

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
    [moveItemToSection, moveSectionToSection, section.id],
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
      nodes.forEach(onAdd);
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
      items: memoizedItems,
      refs: {
        items: itemRefs,
        wrapper: wrapperRef,
        gridstack: gridRef,
      },
      sectionColumnCount: section.columnCount,
    });

    if (isReady) {
      markAsReady(section.id);
    }

    // Only run this effect when the section items change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, memoizedItems.length, section.columnCount]);

  useRegisterItemKeyboardActions(gridRef.current!, itemRefs);

  return {
    refs: {
      items: itemRefs,
      wrapper: wrapperRef,
      gridstack: gridRef,
    },
  };
};

interface UseCssVariableConfiguration {
  mainRef?: RefObject<HTMLDivElement>;
  gridRef: UseGridstackRefs["gridstack"];
  wrapperRef: UseGridstackRefs["wrapper"];
  width: number;
  section: Omit<Section, "items">;
}

/**
 * This hook is used to configure the css variables for the gridstack
 * Those css variables are used to define the size of the gridstack items
 * @see gridstack.scss
 * @param mainRef reference to the main div wrapping all sections
 * @param gridRef reference to the gridstack object
 */
const useCssVariableConfiguration = ({
  gridRef,
  wrapperRef,
  width,
  section,
}: UseCssVariableConfiguration) => {
  const onResize = useCallback(() => {
    if (!wrapperRef?.current) return;
    const widgetWidth = wrapperRef.current.clientWidth / section.columnCount;
    // widget width is used to define sizes of gridstack items within global.scss
    wrapperRef.current?.style.setProperty(
      "--gridstack-widget-width",
      widgetWidth.toString(),
    );
    gridRef.current?.cellHeight(widgetWidth);
  }, [section.columnCount, wrapperRef, gridRef]);

  // Define widget-width by calculating the width of one column with mainRef width and column count
  useEffect(() => {
    onResize();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", onResize);
    const wrapper = wrapperRef.current;
    wrapper?.addEventListener("resize", onResize);
    return () => {
      if (typeof window === "undefined") return;
      window.removeEventListener("resize", onResize);
      wrapper?.removeEventListener("resize", onResize);
    };
  }, [wrapperRef, gridRef, section.columnCount, onResize]);

  // Handle resize of inner sections when there size changes
  useEffect(() => {
    onResize();
  }, [width, onResize]);

  // Define column count by using the sectionColumnCount
  useEffect(() => {
    wrapperRef.current?.style.setProperty(
      "--gridstack-column-count",
      section.columnCount.toString(),
    );
  }, [section.columnCount, wrapperRef]);
};

const useRegisterItemKeyboardActions = (
  gridstack: GridStack,
  itemRefs: UseGridstackRefs["items"],
) => {
  const [selected, setSelected] = useAtom(selectedItemAtom);
  useWindowEvent("keydown", (event) => {
    if (!selected) return;

    const currentRef = itemRefs.current[selected];
    if (!currentRef?.current) return;

    const xOffset = currentRef.current.gridstackNode?.x ?? 0;
    const yOffset = currentRef.current.gridstackNode?.y ?? 0;
    const width = currentRef.current.gridstackNode?.w ?? 1;
    const height = currentRef.current.gridstackNode?.h ?? 1;

    if (event.key === "Escape") {
      setSelected(null);
    }
    if (event.shiftKey) {
      if (event.key === "ArrowUp") {
        return gridstack.update(currentRef.current, {
          h: Math.max(1, height - 1),
        });
      }
      if (event.key === "ArrowDown") {
        return gridstack.update(currentRef.current, {
          h: height + 1,
        });
      }
      if (event.key === "ArrowLeft") {
        return gridstack.update(currentRef.current, {
          w: Math.max(1, width - 1),
        });
      }
      if (event.key === "ArrowRight") {
        return gridstack.update(currentRef.current, {
          w: width + 1,
        });
      }
    }
    if (event.key === "ArrowUp") {
      return gridstack.update(currentRef.current, {
        y: Math.max(0, yOffset - 1),
      });
    }
    if (event.key === "ArrowDown") {
      return gridstack.update(currentRef.current, {
        y: yOffset + 1,
      });
    }
    if (event.key === "ArrowLeft") {
      return gridstack.update(currentRef.current, {
        x: Math.max(0, xOffset - 1),
      });
    }
    if (event.key === "ArrowRight") {
      return gridstack.update(currentRef.current, {
        x: xOffset + 1,
      });
    }
  });
};
