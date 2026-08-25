"use client";

import type { PropsWithChildren } from "react";
import { Box, Paper, Stack, Text } from "@mantine/core";
import { IconBulb } from "@tabler/icons-react";

import { useCurrentLayout, useInitialViewportWidth, useLayoutOverride, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getRepresentativeLayoutWidth } from "@homarr/boards/layout-preview";
import { useI18n } from "@homarr/translation/client";
import { FloatingTip } from "@homarr/ui";

import { BoardAdvancedFocusProvider } from "~/components/board/advanced-focus/context";
import { BoardAppsSpotlightRegistrar } from "~/components/board/board-apps-spotlight-registrar";
import { BoardEmptyState } from "~/components/board/board-empty-state";
import { BoardSetupChecklist } from "~/components/board/board-setup-checklist";
import {
  getBoardLaneColumnCount,
  getInitialBoardLogicalHeight,
  getLogicalGridSize,
  LOGICAL_GRID_GAP,
  getRootSectionForLane,
} from "~/components/board/layout";
import { ScaledBoardCanvas } from "~/components/board/layout/scaled-board-canvas";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { BoardGridEditorBoundary } from "~/components/board/sections/grid/board-grid-editor-boundary";
import { GridEditorRegistryProvider } from "~/components/board/sections/grid/grid-editor-registry";
import { BoardGridPortalHost } from "~/components/board/sections/grid/grid-portal-host";
import { BoardSectionCollapseProvider } from "~/components/board/sections/section-collapse";
import { BoardBackgroundVideo } from "~/components/layout/background";
import { BoardSelectionProvider } from "~/components/board/selection/board-selection-context";
import { BoardSelectionToolbar } from "~/components/board/selection/board-selection-toolbar";
import classes from "./_client.module.css";

const APP_SHELL_INLINE_PADDING = 32;

const BoardSelectionGridProvider = ({ children }: PropsWithChildren) => (
  <GridEditorRegistryProvider>
    <BoardSelectionProvider>{children}</BoardSelectionProvider>
  </GridEditorRegistryProvider>
);

export const ClientBoard = () => {
  const board = useRequiredBoard();
  const t = useI18n("board.landmark");
  const tPreview = useI18n("board.setting.section.layout.preview");
  const tTips = useI18n("tips");
  const [isEditMode] = useEditMode();
  const currentLayoutId = useCurrentLayout();
  const initialViewportWidth = useInitialViewportWidth();
  const layoutOverrideId = useLayoutOverride();
  const currentLayout = board.layouts.find((layout) => layout.id === currentLayoutId) ?? board.layouts.at(0);
  if (!currentLayout) throw new Error("Expected the board to contain a layout");

  const mainSection = getRootSectionForLane(board, "main");
  const leftSection = getRootSectionForLane(board, "left");
  const rightSection = getRootSectionForLane(board, "right");
  if (!mainSection) throw new Error("Expected the board to contain a main canvas section");

  const leftColumnCount = getBoardLaneColumnCount(currentLayout, "left");
  const mainColumnCount = getBoardLaneColumnCount(currentLayout, "main");
  const rightColumnCount = getBoardLaneColumnCount(currentLayout, "right");
  const laneWidths = [leftColumnCount, mainColumnCount, rightColumnCount]
    .filter((columnCount) => columnCount > 0)
    .map(getLogicalGridSize);
  const logicalWidth =
    laneWidths.reduce((total, width) => total + width, 0) + (laneWidths.length - 1) * LOGICAL_GRID_GAP;
  const initialLogicalHeight = getInitialBoardLogicalHeight(board, currentLayoutId);
  const representativeWidth = layoutOverrideId ? getRepresentativeLayoutWidth(currentLayout, board.layouts) : null;
  const initialAvailableWidth = Math.max(1, (representativeWidth ?? initialViewportWidth) - APP_SHELL_INLINE_PADDING);
  const gridTemplateColumns = [
    leftColumnCount > 0 ? `${getLogicalGridSize(leftColumnCount)}px` : null,
    `${getLogicalGridSize(mainColumnCount)}px`,
    rightColumnCount > 0 ? `${getLogicalGridSize(rightColumnCount)}px` : null,
  ]
    .filter((value) => value !== null)
    .join(" ");

  const content = (
    <BoardSelectionGridProvider>
      <BoardAdvancedFocusProvider>
        <Box h="100%" pos="relative" data-homarr-dev-benchmark-board>
          <BoardAppsSpotlightRegistrar />
          <BoardBackgroundVideo />
          <BoardEmptyState />
          <BoardSetupChecklist />
          <BoardSectionCollapseProvider>
            <BoardGridPortalHost>
              <ScaledBoardCanvas
                logicalWidth={logicalWidth}
                initialLogicalHeight={initialLogicalHeight}
                initialAvailableWidth={initialAvailableWidth}
                label={board.name}
              >
                <BoardGridEditorBoundary key={currentLayoutId}>
                  <div className={classes.columns} style={{ gridTemplateColumns }}>
                    {leftColumnCount > 0 && leftSection && (
                      <aside
                        className={`${classes.lane} ${classes.gutter}`}
                        aria-label={t("leftRail")}
                        data-board-gutter="left"
                        data-board-editing={isEditMode ? "true" : undefined}
                      >
                        <BoardEmptySection
                          key={`${currentLayoutId}-${leftSection.id}`}
                          section={leftSection}
                          columnCount={leftColumnCount}
                          requestedRowCount={0}
                          railPlacement="left"
                        />
                      </aside>
                    )}

                    <section className={classes.lane} aria-label={t("canvas")}>
                      <BoardEmptySection
                        key={`${currentLayoutId}-${mainSection.id}`}
                        section={mainSection}
                        columnCount={mainColumnCount}
                        requestedRowCount={0}
                      />
                    </section>

                    {rightColumnCount > 0 && rightSection && (
                      <aside
                        className={`${classes.lane} ${classes.gutter}`}
                        aria-label={t("rightRail")}
                        data-board-gutter="right"
                        data-board-editing={isEditMode ? "true" : undefined}
                      >
                        <BoardEmptySection
                          key={`${currentLayoutId}-${rightSection.id}`}
                          section={rightSection}
                          columnCount={rightColumnCount}
                          requestedRowCount={0}
                          railPlacement="right"
                        />
                      </aside>
                    )}
                  </div>
                </BoardGridEditorBoundary>
              </ScaledBoardCanvas>
            </BoardGridPortalHost>
          </BoardSectionCollapseProvider>
          <BoardSelectionToolbar />
          <FloatingTip
            opened={isEditMode}
            showDelay={2_000}
            dismissAfter={3_000}
            transitionDuration={200}
            closable={false}
            alertProps={{ color: "primaryColor", icon: <IconBulb size={18} />, variant: "light" }}
          >
            {tTips("multiSelectApps")}
          </FloatingTip>
        </Box>
      </BoardAdvancedFocusProvider>
    </BoardSelectionGridProvider>
  );

  if (representativeWidth === null) return content;

  return (
    <Stack align="center" gap="xs" p="md" mih="100%">
      <Text size="xs" c="dimmed" fw={500}>
        {tPreview("editorWidthLabel", { layoutName: currentLayout.name, width: representativeWidth })}
      </Text>
      <Paper
        withBorder
        shadow="sm"
        radius="md"
        w={`min(${representativeWidth}px, calc(100vw - 2rem))`}
        mih="calc(100dvh - 8rem)"
        style={{ overflow: "hidden" }}
      >
        {content}
      </Paper>
    </Stack>
  );
};
