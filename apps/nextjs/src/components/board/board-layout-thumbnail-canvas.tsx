"use client";

import { useMemo } from "react";
import { Box } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";

import type { BoardPreviewData, BoardPreviewLayout } from "@homarr/boards/layout-preview";
import { getRepresentativeLayoutWidth, projectBoardLayout } from "@homarr/boards/layout-preview";
import type { GridAlgorithmItem } from "@homarr/common";
import { getRootSectionLane } from "@homarr/definitions";
import { MaskedOrNormalImage } from "@homarr/ui";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";

import { getBoardCanvasGeometry } from "./layout/canvas-geometry";
import { BOARD_GRID_ITEM_INSET, LOGICAL_GRID_PITCH } from "./layout/constants";
import { calculateBoardUiScale, getBoardCanvasMetrics, getBoardScaling } from "./layout/scaling";
import { useCanvasViewportSize } from "./layout/use-canvas-viewport-size";
import appearanceClasses from "./layout/canvas-appearance.module.css";
import scrollbarClasses from "./layout/canvas-scrollbar.module.css";
import classes from "./board-layout-thumbnail.module.css";

export interface BoardLayoutThumbnailCanvasProps {
  preview: BoardPreviewData;
  label: string;
  className?: string;
  canvas: {
    layout: BoardPreviewLayout;
    sourceLayout: BoardPreviewLayout;
    settings: {
      fixedScaling: boolean;
      fixedItemSize: number;
      opacity: number;
      itemRadius: string;
      iconColor: string | null;
      backgroundImageUrl: string | null;
      backgroundImageSize: string;
      backgroundImageRepeat: string;
      backgroundImageAttachment: string;
    };
  };
}

/** The Boards thumbnail with exact canvas geometry for the settings draft. */
export const BoardLayoutThumbnailCanvas = ({ preview, label, canvas, className }: BoardLayoutThumbnailCanvasProps) => {
  const { layout, sourceLayout, settings } = canvas;
  const { ref: viewportRef, width, height } = useCanvasViewportSize();
  const screenWidth = Math.max(320, getRepresentativeLayoutWidth(layout, preview.layouts));
  const miniatureScale = width / screenWidth;
  const geometry = getBoardCanvasGeometry(layout);
  const metrics = getBoardCanvasMetrics(getBoardScaling(settings), screenWidth - 32, geometry.width);
  const visualUiScale = metrics.scale * calculateBoardUiScale(metrics.scale);
  const elements = useMemo(() => projectBoardLayout(preview, sourceLayout, layout), [preview, sourceLayout, layout]);
  const roots = preview.sections.filter((section) => section.kind === "empty");
  const rootIds = new Set(roots.map((section) => section.id));
  const rootElements = elements.filter((element) => rootIds.has(element.sectionId));
  const rowCount = Math.max(2, ...rootElements.map((element) => element.yOffset + element.height));
  const pitch = LOGICAL_GRID_PITCH * metrics.scale;
  const canvasOffset = Math.max(0, (screenWidth - 32 - metrics.width) / 2);
  const contentWidth = Math.max(screenWidth, metrics.width + 32);
  let canvasTop = 16;
  if (settings.fixedScaling) canvasTop += 32 * metrics.scale;
  const contentHeight = rowCount * pitch + canvasTop + 16;
  const itemsById = new Map(preview.items.map((item) => [item.id, item]));
  const stationaryBackground = settings.fixedScaling || settings.backgroundImageAttachment === "fixed";
  const backgroundStyle = {
    backgroundImage: settings.backgroundImageUrl ? `url(${JSON.stringify(settings.backgroundImageUrl)})` : undefined,
    backgroundSize: settings.backgroundImageSize,
    backgroundRepeat: settings.backgroundImageRepeat,
    backgroundPosition: "center center",
  };

  const renderIcon = (id: string) => {
    const item = itemsById.get(id);
    const WidgetIcon = item?.kind ? widgetCatalogIcons[item.kind] : IconLayoutGrid;
    if (item?.iconUrl) {
      return (
        <MaskedOrNormalImage
          imageUrl={item.iconUrl}
          hasColor={Boolean(settings.iconColor)}
          color={settings.iconColor || undefined}
          alt=""
          className={classes.scaledItemIcon}
        />
      );
    }
    return <WidgetIcon className={classes.scaledItemIcon} stroke={1.7} />;
  };

  // Keep the familiar nested-container representation without mounting live widgets.
  const renderContents = (element: GridAlgorithmItem) => {
    if (element.type === "item") return renderIcon(element.id);
    const nestedItems = elements.filter((candidate) => candidate.sectionId === element.id);
    const columns = Math.max(element.width, ...nestedItems.map((item) => item.xOffset + item.width));
    const rows = Math.max(element.height, ...nestedItems.map((item) => item.yOffset + item.height));
    return (
      <span
        className={classes.containerContents}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {nestedItems.map((item) => (
          <span
            key={item.id}
            className={classes.tile}
            style={{
              gridColumn: `${item.xOffset + 1} / span ${item.width}`,
              gridRow: `${item.yOffset + 1} / span ${item.height}`,
            }}
          >
            {renderIcon(item.id)}
          </span>
        ))}
      </span>
    );
  };

  return (
    <Box className={[classes.canvas, classes.exactCanvas, className].filter(Boolean).join(" ")}>
      {stationaryBackground && (
        <Box
          aria-hidden
          className={classes.scaledSurface}
          style={{
            ...backgroundStyle,
            width: screenWidth,
            height: height / (miniatureScale || 1),
            transform: `scale(${miniatureScale})`,
            pointerEvents: "none",
          }}
        />
      )}
      <Box
        component="section"
        ref={viewportRef}
        aria-label={label}
        tabIndex={0}
        className={`${classes.thumbnailViewport} ${scrollbarClasses.scrollbar}`}
        data-testid="layout-preview-viewport"
        data-preview-scale={miniatureScale}
        data-item-size={metrics.itemSize}
      >
        <Box
          style={{
            width: contentWidth * miniatureScale,
            height: contentHeight * miniatureScale,
            minHeight: "100%",
            overflow: "clip",
            position: "relative",
          }}
        >
          <Box
            aria-hidden
            className={`${classes.scaledSurface} ${appearanceClasses.appearance}`}
            style={{
              width: contentWidth,
              height: Math.max(contentHeight, (screenWidth * 7) / 16),
              transform: `scale(${miniatureScale})`,
              "--board-canvas-ui-scale": visualUiScale,
              "--preview-opacity": settings.opacity / 100,
              "--preview-radius": `var(--mantine-radius-${settings.itemRadius})`,
              color: settings.iconColor || undefined,
              ...(!stationaryBackground && backgroundStyle),
            }}
          >
            {geometry.lanes.map((lane) => {
              const root = roots.find((section) => getRootSectionLane(section.xOffset) === lane.lane);
              const laneElements = rootElements.filter((element) => element.sectionId === root?.id);
              return (
                <Box
                  key={lane.lane}
                  data-preview-lane={lane.lane}
                  className={classes.scaledLane}
                  style={{
                    left: 16 + canvasOffset + lane.offset * metrics.scale,
                    top: canvasTop,
                    width: lane.width * metrics.scale,
                    height: rowCount * pitch,
                  }}
                >
                  {laneElements.map((element) => {
                    let inset = BOARD_GRID_ITEM_INSET;
                    if (element.type === "section" && !settings.fixedScaling) inset = 5 * visualUiScale;
                    return (
                      <Box
                        key={`${element.type}-${element.id}`}
                        className={`${classes.tile} ${classes.scaledTile}`}
                        data-preview-tile
                        data-type={element.type}
                        style={{
                          left: element.xOffset * pitch + inset,
                          top: element.yOffset * pitch + inset,
                          width: Math.max(0, element.width * pitch - 2 * inset),
                          height: Math.max(0, element.height * pitch - 2 * inset),
                        }}
                      >
                        {renderContents(element)}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
