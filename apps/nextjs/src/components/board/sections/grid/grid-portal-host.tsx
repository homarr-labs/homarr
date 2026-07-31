"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GridItemHTMLElement } from "gridstack";

import type { RouterOutputs } from "@homarr/api";
import { useIntegrations } from "@homarr/auth/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { getRootSectionLane } from "@homarr/definitions";

import type { DynamicSectionItem, Section } from "~/app/[locale]/boards/_types";
import { getBoardLaneColumnCount } from "~/components/board/layout";
import { SectionContentItem } from "../content";
import { SectionProvider } from "../section-context";
import { useSectionItems } from "../use-section-items";
import { decorateGridResizeHandles } from "./grid-resize-handles";
import classes from "./section-grid.module.css";

interface GridPortalHostContextValue {
  announce: (message: string) => void;
  integrations: RouterOutputs["integration"]["all"] | undefined;
  acquireContainer: (id: string) => HTMLElement;
  releaseContainer: (id: string, container: HTMLElement) => void;
}

const GridPortalHostContext = createContext<GridPortalHostContextValue | null>(null);

/**
 * One portal registry owns every edit-mode item on the board. Its content
 * containers are stable even when GridStack replaces or transfers the outer
 * positioning shell, so moving between grids does not remount widget content.
 */
export const BoardGridPortalHost = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const integrations = useIntegrations();
  const containersRef = useRef<Map<string, HTMLElement>>(new Map());
  const [containers, setContainers] = useState<Map<string, HTMLElement>>(() => new Map());
  const [announcement, setAnnouncement] = useState({ id: 0, message: "" });
  const announce = useCallback((message: string) => {
    setAnnouncement((previous) => ({ id: previous.id + 1, message }));
  }, []);

  const acquireContainer = useCallback((id: string) => {
    const existing = containersRef.current.get(id);
    if (existing) return existing;

    const container = document.createElement("div");
    container.className = "grid-stack-item-content";
    container.style.overflow = "visible";
    containersRef.current.set(id, container);
    setContainers(new Map(containersRef.current));
    return container;
  }, []);

  const releaseContainer = useCallback((id: string, container: HTMLElement) => {
    // Controlled cross-grid moves remove the source shell before the target
    // adopts this container. Wait until all grid effects in the commit ran.
    queueMicrotask(() => {
      if (container.isConnected || containersRef.current.get(id) !== container) return;
      containersRef.current.delete(id);
      setContainers(new Map(containersRef.current));
    });
  }, []);

  const value = useMemo<GridPortalHostContextValue>(
    () => ({
      announce,
      integrations,
      acquireContainer,
      releaseContainer,
    }),
    [acquireContainer, announce, integrations, releaseContainer],
  );

  return (
    <GridPortalHostContext.Provider value={value}>
      {children}
      {Array.from(containers, ([id, container]) => {
        const ownerSectionId = getOwnerSectionId(board, currentLayoutId, id);
        return ownerSectionId
          ? createPortal(
              <GridPortalContent
                itemId={id}
                ownerSectionId={ownerSectionId}
                container={container}
                integrations={integrations}
                announce={announce}
              />,
              container,
              id,
            )
          : null;
      })}
      <div className={classes.liveRegion} aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.message}</span>
      </div>
    </GridPortalHostContext.Provider>
  );
};

export const useBoardGridPortalHost = () => {
  const context = useContext(GridPortalHostContext);
  if (!context) throw new Error("BoardGridPortalHost is required");
  return context;
};

interface GridPortalContentProps {
  itemId: string;
  ownerSectionId: string;
  container: HTMLElement;
  integrations: RouterOutputs["integration"]["all"] | undefined;
  announce: (message: string) => void;
}

const GridPortalContent = ({ itemId, ownerSectionId, container, integrations, announce }: GridPortalContentProps) => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { items, innerSections } = useSectionItems(ownerSectionId);
  const entry = [...items, ...innerSections].find((candidate) => candidate.id === itemId);
  const rawSection = board.sections.find((section) => section.id === ownerSectionId);
  const currentLayout = board.layouts.find((layout) => layout.id === currentLayoutId);
  const section = toGridSection(rawSection, currentLayoutId);

  useLayoutEffect(() => {
    const itemElement = container.parentElement as GridItemHTMLElement | null;
    if (!itemElement) return;

    itemElement.gridstackNode?.grid?.refreshDragHandles(itemElement);
    decorateGridResizeHandles(itemElement);
  }, [container, ownerSectionId]);

  if (!entry || !section || !currentLayout) return null;

  const columnCount =
    section.kind === "dynamic"
      ? section.width
      : section.kind === "empty"
        ? getBoardLaneColumnCount(currentLayout, getRootSectionLane(section.xOffset))
        : currentLayout.columnCount;
  const configuredMaxRowCount = section.kind === "dynamic" ? section.height : null;
  const contentRowCount = Math.max(
    1,
    ...items.map((item) => item.yOffset + item.height),
    ...innerSections.map((innerSection) => innerSection.yOffset + innerSection.height),
  );
  const maxRowCount = configuredMaxRowCount === null ? null : Math.max(configuredMaxRowCount, contentRowCount);

  return (
    <SectionProvider
      value={{
        section,
        items,
        innerSections,
        integrations,
        columnCount,
        maxRowCount,
        announce,
      }}
    >
      <SectionContentItem item={entry} integrations={integrations} />
    </SectionProvider>
  );
};

const toGridSection = (
  section: Section | undefined,
  layoutId: string,
): Exclude<Section, { kind: "dynamic" }> | DynamicSectionItem | null => {
  if (!section) return null;
  if (section.kind !== "dynamic") return section;

  const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
  if (!layout) return null;

  return {
    ...section,
    ...layout,
    type: "section",
  };
};

const getOwnerSectionId = (board: ReturnType<typeof useRequiredBoard>, layoutId: string, entryId: string) => {
  const item = board.items.find((candidate) => candidate.id === entryId);
  if (item) {
    return item.layouts.find((layout) => layout.layoutId === layoutId)?.sectionId ?? null;
  }

  const section = board.sections.find((candidate) => candidate.kind === "dynamic" && candidate.id === entryId);
  if (!section || section.kind !== "dynamic") return null;
  return section.layouts.find((layout) => layout.layoutId === layoutId)?.parentSectionId ?? null;
};
