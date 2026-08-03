"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { RouterOutputs } from "@homarr/api";
import { useIntegrations } from "@homarr/auth/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { getRootSectionLane } from "@homarr/definitions";

import type { ContainerSectionItem, Section } from "~/app/[locale]/boards/_types";
import { getBoardLaneColumnCount } from "~/components/board/layout";
import { SectionContentItem } from "../content";
import { SectionProvider } from "../section-context";
import { useSectionItems } from "../use-section-items";
import classes from "./section-grid.module.css";

interface GridPortalHostContextValue {
  announce: (message: string) => void;
  integrations: RouterOutputs["integration"]["all"] | undefined;
  containers: ReadonlyMap<string, HTMLElement>;
  acquireContainer: (id: string) => HTMLElement;
}

const GridPortalHostContext = createContext<GridPortalHostContextValue | null>(null);

/**
 * One portal registry owns every edit-mode item on the board. Its content
 * containers are stable even when drag-and-drop replaces or transfers the
 * outer positioning shell, so moving between grids does not remount widget
 * content.
 */
export const BoardGridPortalHost = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();
  const integrations = useIntegrations();
  const containersRef = useRef<Map<string, HTMLElement>>(new Map());
  const [containers, setContainers] = useState<Map<string, HTMLElement>>(() => new Map());
  const [announcement, setAnnouncement] = useState({ id: 0, message: "" });
  const announce = useCallback((message: string) => {
    setAnnouncement((previous) => ({ id: previous.id + 1, message }));
  }, []);
  const liveEntryIds = useMemo(
    () => new Set([...board.items.map((item) => item.id), ...board.sections.map((section) => section.id)]),
    [board.items, board.sections],
  );

  const acquireContainer = useCallback((id: string) => {
    const existing = containersRef.current.get(id);
    if (existing) return existing;

    const container = document.createElement("div");
    container.className = "board-grid-portal-content";
    container.dataset.boardGridPortal = id;
    containersRef.current.set(id, container);
    setContainers(new Map(containersRef.current));
    return container;
  }, []);

  useEffect(() => {
    // A cross-grid move can briefly have no shell, but the entry still exists
    // on the board. Only remove containers whose board entity was deleted.
    let didPrune = false;
    for (const id of containersRef.current.keys()) {
      if (liveEntryIds.has(id)) continue;
      containersRef.current.delete(id);
      didPrune = true;
    }
    if (didPrune) setContainers(new Map(containersRef.current));
  }, [liveEntryIds]);

  const value = useMemo<GridPortalHostContextValue>(
    () => ({
      announce,
      integrations,
      containers,
      acquireContainer,
    }),
    [acquireContainer, announce, containers, integrations],
  );

  return (
    <GridPortalHostContext.Provider value={value}>
      {children}
      <div className={classes.liveRegion} aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.message}</span>
      </div>
    </GridPortalHostContext.Provider>
  );
};

/**
 * Renders stable portal content at this component's logical React position.
 * Keep it inside the editor runtime and dnd-kit providers so portaled entries
 * inherit the same keyboard, transaction, and nested-grid contexts as shells.
 */
export const BoardGridPortalRenderer = () => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { announce, containers, integrations } = useBoardGridPortalHost();

  return (
    <>
      {Array.from(containers, ([id, container]) => {
        const ownerSectionId = getOwnerSectionId(board, currentLayoutId, id);
        return ownerSectionId
          ? createPortal(
              <GridPortalContent
                itemId={id}
                ownerSectionId={ownerSectionId}
                integrations={integrations}
                announce={announce}
              />,
              container,
              id,
            )
          : null;
      })}
    </>
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
  integrations: RouterOutputs["integration"]["all"] | undefined;
  announce: (message: string) => void;
}

const GridPortalContent = ({ itemId, ownerSectionId, integrations, announce }: GridPortalContentProps) => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { items, innerSections } = useSectionItems(ownerSectionId);
  const persistedEntry = [...items, ...innerSections].find((candidate) => candidate.id === itemId);
  const entry = persistedEntry;
  const rawSection = board.sections.find((section) => section.id === ownerSectionId);
  const currentLayout = board.layouts.find((layout) => layout.id === currentLayoutId);
  const persistedSection = toGridSection(rawSection, currentLayoutId);
  const section = persistedSection;

  if (!entry || !section || !currentLayout) return null;

  const columnCount =
    section.kind === "container"
      ? section.width
      : section.kind === "empty"
        ? getBoardLaneColumnCount(currentLayout, getRootSectionLane(section.xOffset))
        : currentLayout.columnCount;
  const configuredMaxRowCount = section.kind === "container" ? section.height : null;
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
): Exclude<Section, { kind: "container" }> | ContainerSectionItem | null => {
  if (!section) return null;
  if (section.kind !== "container") return section;

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

  const section = board.sections.find((candidate) => candidate.kind === "container" && candidate.id === entryId);
  if (!section || section.kind !== "container") return null;
  return section.layouts.find((layout) => layout.layoutId === layoutId)?.parentSectionId ?? null;
};
