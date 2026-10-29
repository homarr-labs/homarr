"use client";

import { useEffect, useMemo, useRef } from "react";

import { clientApi } from "@homarr/api/client";
import { IntegrationProvider } from "@homarr/auth/client";
import { BoardPreviewProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";

import type { Board, ContainerSectionItem } from "~/app/[locale]/boards/_types";
import { BoardAdvancedFocusProvider } from "~/components/board/advanced-focus/context";
import { getLogicalGridSize } from "~/components/board/layout";
import { ScaledBoardCanvas } from "~/components/board/layout/scaled-board-canvas";
import { BoardSelectionProvider } from "~/components/board/selection/board-selection-context";
import { WidgetPreviewRuntime } from "../../items/lazy-widget-edit-modal";
import { BoardEmptySection } from "../empty-section";
import { BoardGridEditorBoundary } from "../grid/board-grid-editor-boundary";
import { GridEditorRegistryProvider } from "../grid/grid-editor-registry";
import { BoardGridPortalHost } from "../grid/grid-portal-host";
import { BoardSectionCollapseProvider } from "../section-collapse";
import { SmartContainerPreviewStateProvider } from "./smart-container-context";
import classes from "./smart-container-editor-preview.module.css";

interface Props {
  board: Board;
  containerId: string;
  selectedStateId: string;
  layoutId?: string;
  onSelectState?: (id: string) => void;
}

/** Render the same native container against a local board draft, with its own view state. */
export const SmartContainerEditorPreview = ({
  board,
  containerId,
  selectedStateId,
  layoutId,
  onSelectState,
}: Props) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { data: integrations = [] } = clientApi.integration.all.useQuery();
  const preview = useMemo(() => {
    const container = board.sections.find((section) => section.id === containerId);
    if (container?.kind !== "container") return null;
    const layout = container.layouts.find((entry) => entry.layoutId === layoutId) ?? container.layouts[0];
    if (!layout) return null;
    const root = board.sections.find((section) => section.id === layout.parentSectionId && section.kind === "empty");
    const rootId = root?.id ?? `container-preview-${containerId}`;
    const section: ContainerSectionItem = {
      ...container,
      ...layout,
      xOffset: 0,
      yOffset: 0,
      parentSectionId: rootId,
      type: "section",
    };
    const included = new Set([containerId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of board.sections) {
        if (candidate.kind !== "container" || included.has(candidate.id)) continue;
        if (
          !candidate.layouts.some((entry) => entry.layoutId === layout.layoutId && included.has(entry.parentSectionId))
        )
          continue;
        included.add(candidate.id);
        changed = true;
      }
    }
    const rootSection = {
      id: rootId,
      kind: "empty" as const,
      xOffset: 0,
      yOffset: 0,
      width: section.width,
      height: section.height,
    };
    const sections = [
      rootSection,
      ...board.sections
        .filter((entry) => included.has(entry.id))
        .map((entry) => {
          if (entry.id !== containerId || entry.kind !== "container") return entry;
          return {
            ...entry,
            collapsed: false,
            options: { ...entry.options, collapsible: false, showOpenAll: false },
            layouts: entry.layouts.map((entryLayout) => {
              if (entryLayout.layoutId !== layout.layoutId) return entryLayout;
              return { ...entryLayout, xOffset: 0, yOffset: 0, parentSectionId: rootId };
            }),
          };
        }),
    ];
    return {
      board: {
        ...board,
        sections,
        items: board.items.filter((item) =>
          item.layouts.some((entry) => entry.layoutId === layout.layoutId && included.has(entry.sectionId)),
        ),
        layouts: board.layouts.filter((entry) => entry.id === layout.layoutId),
      },
      section,
      root: rootSection,
    };
  }, [board, containerId, layoutId]);
  useEffect(() => {
    previewRef.current?.querySelectorAll<HTMLElement>('[data-grid-item-type="item"]').forEach((item) => {
      item.inert = true;
    });
  }, [preview, selectedStateId]);
  if (!preview) return null;
  return (
    <IntegrationProvider integrations={integrations}>
      <WidgetPreviewRuntime>
        <BoardPreviewProvider board={preview.board}>
          <EditModeProvider>
            <GridEditorRegistryProvider>
              <BoardSelectionProvider>
                <BoardAdvancedFocusProvider>
                  <BoardSectionCollapseProvider>
                    <BoardGridPortalHost>
                      <SmartContainerPreviewStateProvider value={{ stateId: selectedStateId, onSelectState }}>
                        <div ref={previewRef} className={classes.preview} data-smart-container-editor-preview>
                          <ScaledBoardCanvas
                            logicalWidth={getLogicalGridSize(preview.section.width)}
                            initialLogicalHeight={getLogicalGridSize(preview.section.height)}
                            initialAvailableWidth={500}
                            label={preview.section.options.title}
                          >
                            <BoardGridEditorBoundary>
                              <BoardEmptySection
                                section={preview.root}
                                columnCount={preview.section.width}
                                requestedRowCount={preview.section.height}
                              />
                            </BoardGridEditorBoundary>
                          </ScaledBoardCanvas>
                        </div>
                      </SmartContainerPreviewStateProvider>
                    </BoardGridPortalHost>
                  </BoardSectionCollapseProvider>
                </BoardAdvancedFocusProvider>
              </BoardSelectionProvider>
            </GridEditorRegistryProvider>
          </EditModeProvider>
        </BoardPreviewProvider>
      </WidgetPreviewRuntime>
    </IntegrationProvider>
  );
};
