import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Board, BoardContainer, BoardItem, BoardRoot, GridSnapshot } from "../../features/boards/contracts";
import type { BoardCanvasProps } from "../../features/boards/canvas";
import { commitGridSnapshots, getGridPlacements } from "../../features/boards/draft";
import type { GridEntryElementStore } from "./grid-editor-registry";
import type { GridPlacement } from "../../features/boards/contracts";

export type SectionGridPlacement = GridPlacement;
export type CommitSectionGridInput = GridSnapshot;
export type SectionItem = BoardItem & BoardItem["layouts"][number] & { type: "item" };
export type ContainerSectionItem = BoardContainer & BoardContainer["layouts"][number] & { type: "section" };
export type Section = BoardRoot | BoardContainer;
export interface BoardRuntimeValue extends BoardCanvasProps {
  announce: (message: string) => void;
  collapsedIds: ReadonlySet<string>;
  toggleCollapsed: (id: string) => void;
  expandSections: (ids: ReadonlySet<string>) => void;
}
const BoardRuntimeContext = createContext<BoardRuntimeValue | null>(null);
export const BoardRuntimeProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: Omit<BoardRuntimeValue, "announce"> }>) => {
  const [announcement, setAnnouncement] = useState({ id: 0, message: "" });
  const announce = useCallback(
    (message: string) => setAnnouncement((previous) => ({ id: previous.id + 1, message })),
    [],
  );
  const context = useMemo(() => ({ ...value, announce }), [value, announce]);
  return (
    <BoardRuntimeContext.Provider value={context}>
      {children}
      <div
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}
        aria-live="polite"
        aria-atomic="true"
      >
        <span key={announcement.id}>{announcement.message}</span>
      </div>
    </BoardRuntimeContext.Provider>
  );
};
export const useBoardRuntime = () => {
  const context = useContext(BoardRuntimeContext);
  if (!context) throw new Error("BoardRuntimeProvider is required");
  return context;
};
export const useGridLayoutActions = () => {
  const { board, resources, editing, onUpdate } = useBoardRuntime();
  const commitSectionGrids = useCallback(
    (snapshots: readonly GridSnapshot[]) => {
      if (!editing || !onUpdate) return false;
      const hasChanges = snapshots.some((snapshot) => {
        const previous = getGridPlacements(board, snapshot.layoutId, snapshot.sectionId);
        const byId = new Map(previous.map((placement) => [placement.id, placement]));
        return (
          previous.length !== snapshot.placements.length ||
          snapshot.placements.some((placement) => {
            const current = byId.get(placement.id);
            return (
              !current ||
              current.x !== placement.x ||
              current.y !== placement.y ||
              current.w !== placement.w ||
              current.h !== placement.h
            );
          })
        );
      });
      if (!hasChanges) return false;
      onUpdate((previous) => commitGridSnapshots(previous, snapshots, resources));
      return true;
    },
    [board, editing, onUpdate, resources],
  );
  const commitSectionGrid = useCallback(
    (snapshot: GridSnapshot) => commitSectionGrids([snapshot]),
    [commitSectionGrids],
  );
  return { commitSectionGrid, commitSectionGrids };
};
export interface SectionContextValue {
  section: BoardRoot | ContainerSectionItem;
  items: SectionItem[];
  innerSections: ContainerSectionItem[];
  columnCount: number;
  maxRowCount: number | null;
  placements: readonly SectionGridPlacement[];
  interactionDisabled: boolean;
  announce: (message: string) => void;
  entryElementStore: GridEntryElementStore;
}
const SectionContext = createContext<SectionContextValue | null>(null);
export const SectionProvider = SectionContext.Provider;
export const useSectionContext = () => {
  const value = useContext(SectionContext);
  if (!value) throw new Error("SectionProvider is required");
  return value;
};
export const getSectionItems = (board: Board, layoutId: string, sectionId: string) => ({
  items: board.items.flatMap((item): SectionItem[] => {
    const placement = item.layouts.find((layout) => layout.layoutId === layoutId && layout.sectionId === sectionId);
    return placement ? [{ ...item, ...placement, type: "item" }] : [];
  }),
  innerSections: board.sections.flatMap((section): ContainerSectionItem[] => {
    if (section.kind !== "container") return [];
    const placement = section.layouts.find(
      (layout) => layout.layoutId === layoutId && layout.parentSectionId === sectionId,
    );
    return placement ? [{ ...section, ...placement, type: "section" }] : [];
  }),
});
