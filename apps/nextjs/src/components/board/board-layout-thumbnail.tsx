import { Box, Center, Image } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";

import type { BoardPreviewData } from "@homarr/boards/layout-preview";
import { projectBoardLayout } from "@homarr/boards/layout-preview";
import { boardLanes, getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";
import { widgetCatalogIcons } from "@homarr/widgets/catalog";

import classes from "./board-layout-thumbnail.module.css";

interface BoardLayoutThumbnailProps {
  preview: BoardPreviewData | null;
  label: string;
  previewRowLimit?: number;
  className?: string;
}

const compactBoardLayoutThumbnailRows = 12;
export const maxBoardLayoutThumbnailRows = 48;

export const BoardLayoutThumbnail = ({
  preview,
  label,
  previewRowLimit = compactBoardLayoutThumbnailRows,
  className,
}: BoardLayoutThumbnailProps) => {
  const canvasClassName = [classes.canvas, className].filter(Boolean).join(" ");
  const layout = preview?.layouts.find((candidate) => candidate.role === "base") ?? preview?.layouts.at(0);
  if (!preview || !layout) {
    return (
      <Center className={canvasClassName} role="img" aria-label={label}>
        <IconLayoutGrid size={28} stroke={1.4} aria-hidden />
      </Center>
    );
  }

  const elements = projectBoardLayout(preview, layout, layout);
  const thumbnailRowLimit = Math.max(1, Math.min(Math.floor(previewRowLimit), maxBoardLayoutThumbnailRows));
  const roots = preview.sections
    .filter((section) => section.kind === "empty")
    .toSorted((first, second) => (first.xOffset ?? 0) - (second.xOffset ?? 0) || first.id.localeCompare(second.id));
  const lanes = boardLanes.flatMap((lane) => {
    const root = roots.find((section) => getRootSectionLane(section.xOffset) === lane);
    const columnCount = getBoardLaneColumnCount(layout, lane);
    return root && columnCount > 0 ? [{ lane, root, columnCount }] : [];
  });
  if (lanes.length === 0) {
    return (
      <Center className={canvasClassName} role="img" aria-label={label}>
        <IconLayoutGrid size={28} stroke={1.4} aria-hidden />
      </Center>
    );
  }

  const renderItemIcon = (itemId: string) => {
    const item = preview.items.find((candidate) => candidate.id === itemId);
    const WidgetIcon = item?.kind ? widgetCatalogIcons[item.kind] : undefined;
    return item?.iconUrl ? (
      <Image className={classes.itemIcon} src={item.iconUrl} alt="" fit="contain" />
    ) : WidgetIcon ? (
      <WidgetIcon className={classes.itemIcon} stroke={1.7} />
    ) : null;
  };

  return (
    <Box className={canvasClassName} role="img" aria-label={label}>
      <div
        className={classes.lanes}
        style={{ gridTemplateColumns: lanes.map(({ columnCount }) => `${columnCount}fr`).join(" ") }}
      >
        {lanes.map(({ lane, root, columnCount }) => {
          const laneElements = elements.filter(
            (element) =>
              element.sectionId === root.id &&
              element.xOffset >= 0 &&
              element.xOffset < columnCount &&
              element.yOffset >= 0 &&
              element.yOffset < thumbnailRowLimit &&
              element.width > 0 &&
              element.height > 0,
          );
          const rowCount = Math.min(
            thumbnailRowLimit,
            Math.max(4, ...laneElements.map((element) => element.yOffset + element.height)),
          );

          return (
            <div
              key={lane}
              className={classes.lane}
              data-lane={lane}
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
              }}
            >
              {laneElements.map((element) => {
                const renderedWidth = Math.min(element.width, columnCount - element.xOffset);
                const renderedHeight = Math.min(element.height, rowCount - element.yOffset);
                const nestedItems =
                  element.type === "section"
                    ? elements.filter(
                        (candidate) =>
                          candidate.type === "item" &&
                          candidate.sectionId === element.id &&
                          candidate.xOffset >= 0 &&
                          candidate.xOffset < renderedWidth &&
                          candidate.yOffset >= 0 &&
                          candidate.yOffset < renderedHeight &&
                          candidate.width > 0 &&
                          candidate.height > 0,
                      )
                    : [];
                return (
                  <span
                    key={`${element.type}-${element.id}`}
                    aria-hidden
                    className={`${classes.tile} ${element.type === "section" ? classes.container : ""}`}
                    style={{
                      gridColumn: `${element.xOffset + 1} / span ${renderedWidth}`,
                      gridRow: `${element.yOffset + 1} / span ${renderedHeight}`,
                    }}
                  >
                    {element.type === "section" ? (
                      <span
                        className={classes.containerContents}
                        style={{
                          gridTemplateColumns: `repeat(${renderedWidth}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${renderedHeight}, minmax(0, 1fr))`,
                        }}
                      >
                        {nestedItems.map((nestedItem) => (
                          <span
                            key={nestedItem.id}
                            className={classes.tile}
                            style={{
                              gridColumn: `${nestedItem.xOffset + 1} / span ${Math.min(
                                nestedItem.width,
                                renderedWidth - nestedItem.xOffset,
                              )}`,
                              gridRow: `${nestedItem.yOffset + 1} / span ${Math.min(
                                nestedItem.height,
                                renderedHeight - nestedItem.yOffset,
                              )}`,
                            }}
                          >
                            {renderItemIcon(nestedItem.id)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      renderItemIcon(element.id)
                    )}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </Box>
  );
};
