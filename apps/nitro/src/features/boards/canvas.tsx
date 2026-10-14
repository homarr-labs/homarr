import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Text } from "@mantine/core";
import type {
  Board,
  BoardAppsClient,
  BoardContainer,
  BoardDomainResources,
  BoardIdentity,
  BoardItemRenderer,
  BoardLayout,
  GridPlacement,
} from "./contracts";
import { getBoardAccess } from "./contracts";
import { getGridPlacements, validateBoardDraft } from "./draft";
import { BoardError } from "./errors";
import { BoardRuntimeProvider } from "../../source-ui/boards/runtime";
import { BoardGridEditorProvider, BoardGridEditorPortals } from "../../source-ui/boards/grid-editor";
import { GridEditorRegistryProvider } from "../../source-ui/boards/grid-editor-registry";
import { ScaledBoardCanvas } from "../../source-ui/boards/scaled-board-canvas";
import { SectionGrid } from "../../source-ui/boards/section-grid";
import { BoardSelectionProvider } from "../../source-ui/boards/selection";
import { BoardSelectionToolbar } from "../../source-ui/boards/board-selection-toolbar";
import {
  getCollapsedDisplayLayout,
  getLayoutRowCount,
  getLogicalGridSize,
  LOGICAL_GRID_GAP,
} from "../../source-ui/boards/layout";
import {
  readSectionCollapsedFromStorage,
  writeSectionCollapsedToStorage,
} from "../../source-ui/boards/section-collapse-storage";
import classes from "../../source-ui/boards/board.module.css";

export interface BoardCanvasProps {
  board: Board;
  layout: BoardLayout;
  canvasWidth: number;
  resources: BoardDomainResources;
  identity: BoardIdentity;
  renderItem: BoardItemRenderer;
  appsClient?: BoardAppsClient;
  editing?: boolean;
  syntheticPreview?: boolean;
  selectionApps?: readonly { id: string; name: string; iconUrl: string | null }[];
  onUpdate?: (update: (board: Board) => Board) => void;
  onEditElement?: (placement: GridPlacement, sectionId: string) => void;
  renderOpenAll?: (section: BoardContainer, board: Board, layoutId: string) => ReactNode;
}
export function BoardCanvas(props: BoardCanvasProps) {
  try {
    validateBoardDraft(props.board, props.resources);
  } catch (error) {
    return <BoardError error={error} />;
  }
  return <ScopedBoardCanvas key={`${props.identity.resourceKey}:${props.board.id}`} {...props} />;
}
function ScopedBoardCanvas(props: BoardCanvasProps) {
  const { board, layout, identity, resources } = props;
  const editing = props.editing === true && (getBoardAccess(board, identity).modify || props.syntheticPreview === true);
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      board.sections
        .filter((section) => section.kind === "container")
        .map((section) => [section.id, section.collapsed]),
    ),
  );
  const [temporarilyExpandedIds, setTemporarilyExpandedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [collapseChanged, setCollapseChanged] = useState(false);
  useEffect(() => {
    if (!editing) setTemporarilyExpandedIds((current) => (current.size === 0 ? current : new Set()));
  }, [editing]);
  useEffect(() => {
    setCollapsedById((previous) => {
      const next = { ...previous };
      for (const section of board.sections) {
        if (section.kind !== "container" || section.id in next) continue;
        next[section.id] = section.collapsed;
      }
      return next;
    });
  }, [board.sections]);
  useEffect(() => {
    if (identity.userId !== null || props.syntheticPreview) return;
    try {
      setCollapsedById((previous) =>
        Object.fromEntries(
          Object.entries(previous).map(([id, collapsed]) => [
            id,
            readSectionCollapsedFromStorage(window.localStorage, id, collapsed),
          ]),
        ),
      );
    } catch {
      setCollapseChanged(true);
    }
  }, [identity.userId, props.syntheticPreview]);
  const collapsedIds = useMemo(
    () =>
      new Set(
        board.sections
          .filter(
            (section) =>
              section.kind === "container" &&
              section.options.collapsible &&
              (collapsedById[section.id] ?? section.collapsed) &&
              (!editing || !temporarilyExpandedIds.has(section.id)),
          )
          .map((section) => section.id),
      ),
    [board.sections, collapsedById, editing, temporarilyExpandedIds],
  );
  const toggleCollapsed = useCallback(
    (id: string) => {
      const collapsed = !collapsedIds.has(id);
      setCollapsedById((previous) => ({ ...previous, [id]: collapsed }));
      setTemporarilyExpandedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setCollapseChanged(true);
      if (identity.userId === null && !props.syntheticPreview) {
        try {
          writeSectionCollapsedToStorage(window.localStorage, id, collapsed);
        } catch {
          setCollapseChanged(true);
        }
      }
    },
    [collapsedIds, identity.userId, props.syntheticPreview],
  );
  const expandSections = useCallback(
    (ids: ReadonlySet<string>) => {
      if (!editing || ids.size === 0) return;
      setTemporarilyExpandedIds((current) => {
        const next = new Set(current);
        for (const id of ids) next.add(id);
        return next.size === current.size ? current : next;
      });
    },
    [editing],
  );
  const lanes = (["left", "main", "right"] as const).flatMap((lane) => {
    const columnCount = resources.definitions.getBoardLaneColumnCount(layout, lane);
    const root = board.sections.find(
      (section) => section.kind === "empty" && resources.definitions.getRootSectionLane(section.xOffset) === lane,
    );
    if (columnCount === 0 || !root || root.kind !== "empty") return [];
    return [{ lane, columnCount, root }];
  });
  const logicalWidth =
    lanes.reduce((total, lane) => total + getLogicalGridSize(lane.columnCount), 0) +
    Math.max(0, lanes.length - 1) * LOGICAL_GRID_GAP;
  const initialLogicalHeight = getLogicalGridSize(
    Math.max(
      1,
      ...lanes.map(({ root, columnCount }) =>
        getLayoutRowCount(
          getCollapsedDisplayLayout(getGridPlacements(board, layout.id, root.id), {
            columnCount,
            collapsedItemIds: collapsedIds,
          }),
        ),
      ),
    ),
  );
  const style: CSSProperties = {
    backgroundImage: board.backgroundImageUrl ? `url(${JSON.stringify(board.backgroundImageUrl)})` : undefined,
    backgroundAttachment: board.backgroundImageAttachment,
    backgroundRepeat: board.backgroundImageRepeat,
    backgroundSize: board.backgroundImageSize,
  };
  return (
    <Box
      className={classes.board}
      style={style}
      data-board-id={board.id}
      data-layout-id={layout.id}
      data-board-left-rail={lanes.some(({ lane }) => lane === "left") || undefined}
      data-board-right-rail={lanes.some(({ lane }) => lane === "right") || undefined}
    >
      <BoardRuntimeProvider value={{ ...props, editing, collapsedIds, toggleCollapsed, expandSections }}>
        <GridEditorRegistryProvider>
          <BoardSelectionProvider>
            <ScaledBoardCanvas
              logicalWidth={logicalWidth}
              initialLogicalHeight={initialLogicalHeight}
              initialAvailableWidth={props.canvasWidth}
              label={board.name}
            >
              <div
                className={classes.columns}
                style={{
                  gridTemplateColumns: lanes.map(({ columnCount }) => `${getLogicalGridSize(columnCount)}px`).join(" "),
                  gap: LOGICAL_GRID_GAP,
                }}
              >
                {lanes.map(({ root, lane, columnCount }) =>
                  lane === "main" ? (
                    <section key={root.id} className={classes.lane} aria-label="Canvas">
                      <SectionGrid
                        key={`${layout.id}:${root.id}`}
                        section={root}
                        columnCount={columnCount}
                        label="Canvas"
                      />
                    </section>
                  ) : (
                    <aside
                      key={root.id}
                      className={`${classes.lane} ${classes.gutter}`}
                      aria-label={`${lane} rail`}
                      data-board-gutter={lane}
                      data-board-editing={editing ? "true" : undefined}
                    >
                      <SectionGrid
                        key={`${layout.id}:${root.id}`}
                        section={root}
                        columnCount={columnCount}
                        railPlacement={lane}
                        label={`${lane} rail`}
                      />
                    </aside>
                  ),
                )}
              </div>
            </ScaledBoardCanvas>
            {editing && (
              <BoardGridEditorProvider key={layout.id}>
                <BoardGridEditorPortals />
              </BoardGridEditorProvider>
            )}
            <BoardSelectionToolbar apps={props.selectionApps} />
          </BoardSelectionProvider>
        </GridEditorRegistryProvider>
      </BoardRuntimeProvider>
      {collapseChanged && (identity.userId !== null || props.syntheticPreview) && (
        <Text size="xs" c="dimmed">
          Collapse preferences are local to this workspace; server persistence is unavailable.
        </Text>
      )}
      {board.customCss && <style>{board.customCss}</style>}
    </Box>
  );
}
