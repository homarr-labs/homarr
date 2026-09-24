import { createContext, useContext } from "react";
import dynamic from "next/dynamic";
import { ActionIcon, Badge, Box, Button, Card } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "@tabler/icons-react";
import combineClasses from "clsx";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n } from "@homarr/translation/client";

import type { ContainerSectionItem } from "~/app/[locale]/boards/_types";
import { COLLAPSED_SECTION_ROW_COUNT, getLogicalGridSize } from "~/components/board/layout";
import { calculateBoardUiScale, useBoardCanvasScale } from "~/components/board/layout/scaled-board-canvas";
import { SectionGrid } from "./grid/section-grid";
import { useSectionCollapse } from "./section-collapse";
import { useOpenSectionApps } from "./use-open-section-apps";
import classes from "./item.module.css";

const BoardContainerMenu = dynamic(
  () => import("./container/container-menu").then((module) => module.BoardContainerMenu),
  { ssr: false },
);

const ContainerDepthContext = createContext(0);

const getBoundedMenuOffset = (offset: number) =>
  `max(calc(4px * var(--mantine-scale)), min(calc(${offset}px * var(--mantine-scale)), calc(100% - 28px * var(--mantine-scale))))`;

interface Props {
  section: ContainerSectionItem;
}

export const BoardContainerSection = ({ section }: Props) => {
  const board = useRequiredBoard();
  const containerDepth = useContext(ContainerDepthContext);
  const canvasScale = useBoardCanvasScale();
  const uiScale = calculateBoardUiScale(canvasScale);
  const controlWidth = getLogicalGridSize(section.width) / uiScale;
  // Keep room for both the menu and collapse control; wrap narrow containers.
  const menuColumns = Math.max(1, Math.floor((controlWidth - 8) / 64));
  const menuLeftOffset = 4 + (containerDepth % menuColumns) * 64;
  const menuTopOffset = 4 + Math.floor(containerDepth / menuColumns) * 32;
  const [isEditMode] = useEditMode();
  const t = useI18n("section.container");
  const tSection = useI18n("section");
  const options = section.options;
  const { open: openAllInNewTabs, isLoading: areAppsLoading } = useOpenSectionApps(
    section.id,
    options.showOpenAll && !isEditMode,
  );
  const { isVisuallyCollapsed, toggle } = useSectionCollapse({
    sectionId: section.id,
    collapsible: options.collapsible,
  });
  const label = options.title.trim() || t("untitled");
  const contentId = `board-container-${section.id}-content`;
  let menuPosition: { left?: number | string; right?: number; top: number | string } = {
    left: getBoundedMenuOffset(menuLeftOffset),
    top: getBoundedMenuOffset(menuTopOffset),
  };
  if (isVisuallyCollapsed) menuPosition = { right: 4, top: 4 };
  let labelTop = "calc(var(--mantine-spacing-xs) * -1)";
  let labelLeft = 8;
  let labelRight = 8;
  if (isEditMode) {
    if (isVisuallyCollapsed) {
      labelRight = 36;
    } else {
      // Reserve a distinct control position for every ancestor, not just the immediate parent.
      labelLeft = menuLeftOffset + 32;
      labelTop = `min(calc(var(--mantine-spacing-xs) * -1 + ${menuTopOffset - 4}px * var(--mantine-scale)), calc(100% - 28px * var(--mantine-scale)))`;
    }
  } else if (options.showOpenAll) {
    labelRight = 40;
  }
  // Expanded controls sit on the border like the ordinary label, without reserving a header row.
  const toggleLayout = isVisuallyCollapsed
    ? { top: 0, left: 0, w: "100%", h: "100%", maw: "100%" }
    : {
        top: labelTop,
        left: labelLeft,
        w: "auto",
        h: 20,
        maw: `calc(100% - ${labelLeft + labelRight}px)`,
      };
  const toggleIcon = isVisuallyCollapsed ? (
    <IconChevronDown size="var(--mantine-font-size-md)" />
  ) : (
    <IconChevronUp size="var(--mantine-font-size-md)" />
  );

  return (
    <Box className="board-grid-item-content" data-grid-item-content w="100%" h="100%" style={{ overflow: "visible" }}>
      <Card
        className={combineClasses(
          classes.itemCard,
          classes.containerCard,
          options.customCssClasses.join(" "),
          isVisuallyCollapsed && classes.collapsedContainerCard,
        )}
        w="100%"
        h="100%"
        data-board-container-collapsed={isVisuallyCollapsed ? "true" : "false"}
        styles={{
          root: {
            overflow: "visible",
            "--opacity": board.opacity / 100,
            "--container-border-color": options.borderColor || undefined,
          },
        }}
        radius={board.itemRadius}
        p={0}
      >
        {options.collapsible && (
          <Button
            className={classes.containerToggle}
            pos="absolute"
            {...toggleLayout}
            px={6}
            ps={isVisuallyCollapsed ? labelLeft : 6}
            pe={isVisuallyCollapsed ? labelRight : 6}
            radius="sm"
            variant="default"
            justify={options.showLabel ? "flex-start" : "center"}
            leftSection={options.showLabel && toggleIcon}
            onClick={toggle}
            aria-expanded={!isVisuallyCollapsed}
            aria-controls={contentId}
            aria-label={`${t(isVisuallyCollapsed ? "action.expand" : "action.collapse")}: ${label}`}
            data-board-container-collapsed-control={isVisuallyCollapsed ? "true" : undefined}
            data-board-container-label
            title={options.showLabel ? label : undefined}
          >
            {options.showLabel ? label : toggleIcon}
          </Button>
        )}
        {!isVisuallyCollapsed && !options.collapsible && options.showLabel && options.title && (
          <Badge
            className={classes.containerLabel}
            pos="absolute"
            top={labelTop}
            left={labelLeft}
            maw={`calc(100% - ${labelLeft + labelRight}px)`}
            size="md"
            radius="sm"
            variant="default"
            c="var(--mantine-color-text)"
            style={{
              zIndex: 9,
              pointerEvents: "none",
            }}
            title={options.title}
            data-board-container-label
          >
            {options.title}
          </Badge>
        )}
        {options.showOpenAll && !isEditMode && (
          <ActionIcon
            className={classes.containerAction}
            pos="absolute"
            top={isVisuallyCollapsed ? "50%" : "calc(var(--mantine-spacing-xs) * -1)"}
            right={8}
            style={{ zIndex: 10, transform: isVisuallyCollapsed ? "translateY(-50%)" : undefined }}
            variant={options.collapsible ? "subtle" : "default"}
            size={24}
            radius="sm"
            loading={areAppsLoading}
            onClick={openAllInNewTabs}
            aria-label={tSection("action.openAllInNewTabsFor", { name: label })}
          >
            <IconExternalLink size="var(--mantine-font-size-md)" />
          </ActionIcon>
        )}
        <Box
          id={contentId}
          className={classes.containerBody}
          h="100%"
          data-board-container-body
          data-collapsed={isVisuallyCollapsed ? "true" : "false"}
          aria-hidden={isVisuallyCollapsed}
          inert={isVisuallyCollapsed}
        >
          <ContainerDepthContext value={containerDepth + 1}>
            <SectionGrid
              section={section}
              columnCount={section.width}
              requestedRowCount={section.height}
              viewportRowCountOverride={isVisuallyCollapsed ? COLLAPSED_SECTION_ROW_COUNT : undefined}
              label={label}
            />
          </ContainerDepthContext>
        </Box>
      </Card>
      {isEditMode && <BoardContainerMenu section={section} position={menuPosition} />}
    </Box>
  );
};
