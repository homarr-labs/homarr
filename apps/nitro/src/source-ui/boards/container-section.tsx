import { createContext, useContext, useRef } from "react";
import { ActionIcon, Badge, Box, Button, Card } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "@tabler/icons-react";
import combineClasses from "clsx";
import { useI18n } from "@homarr/translation/client";
import type { ContainerSectionItem } from "./runtime";
import { useBoardRuntime, useSectionContext } from "./runtime";
import { COLLAPSED_SECTION_ROW_COUNT } from "./layout";
import { SectionGrid } from "./section-grid";
import { BoardContainerMenu } from "./container-menu";
import { BoardSectionOpenAll } from "../../features/boards/open-section-apps";
import classes from "./item.module.css";

const ContainerDepthContext = createContext(0);
const getBoundedMenuOffset = (offset: number) =>
  `max(0px, min(calc(${offset}px * var(--mantine-scale)), calc(100% - 24px * var(--mantine-scale))))`;
export const BoardContainerSection = ({ section }: { section: ContainerSectionItem }) => {
  const runtime = useBoardRuntime();
  const { board, editing, collapsedIds, toggleCollapsed } = runtime;
  const togglePointer = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const containerDepth = useContext(ContainerDepthContext);
  const menuRightOffset = 4 + containerDepth * 32;
  const menuTopOffset = 4 + containerDepth * 32;
  const parent = useSectionContext();
  let containerInlineInsetCount = 2;
  if (
    parent.section.kind === "empty" &&
    runtime.resources.definitions.getRootSectionLane(parent.section.xOffset) !== "main"
  ) {
    if (section.xOffset === 0) containerInlineInsetCount -= 1;
    if (section.xOffset + section.width === parent.columnCount) containerInlineInsetCount -= 1;
  }
  const isEditMode = editing === true;
  const t = useI18n("section.container");
  const tSection = useI18n("section");
  const options = section.options;
  const isVisuallyCollapsed = options.collapsible && collapsedIds.has(section.id);
  const label = options.title.trim() || t("untitled");
  const contentId = `board-container-${section.id}-content`;
  const menuPosition = { right: getBoundedMenuOffset(menuRightOffset), top: getBoundedMenuOffset(menuTopOffset) };
  const labelTop = "calc(var(--mantine-spacing-xs) * -1)";
  const labelLeft = 8;
  let labelRight = 8;
  if (isEditMode) labelRight = menuRightOffset + 32;
  else if (options.showOpenAll) labelRight = 40;
  let labelMaxWidth = `calc(100% - ${labelLeft + labelRight}px)`;
  let collapsedLabelPaddingRight: number | string = labelRight;
  if (isEditMode) {
    const reservedMenuWidth = `calc(${menuPosition.right} + 28px * var(--mantine-scale))`;
    labelMaxWidth = `calc(100% - ${labelLeft}px - ${reservedMenuWidth})`;
    collapsedLabelPaddingRight = reservedMenuWidth;
  }
  const toggleLayout = isVisuallyCollapsed
    ? { top: 0, left: 0, w: "100%", h: "100%", maw: "100%" }
    : { top: labelTop, left: 0, w: "100%", h: 20, maw: "100%" };
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
            ps={labelLeft}
            pe={collapsedLabelPaddingRight}
            radius="sm"
            variant="default"
            justify={options.showLabel ? "flex-start" : "center"}
            leftSection={options.showLabel && toggleIcon}
            onPointerDown={(event) => {
              togglePointer.current = { x: event.clientX, y: event.clientY, moved: false };
            }}
            onPointerMove={(event) => {
              const pointer = togglePointer.current;
              if (!pointer || event.buttons === 0) return;
              if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) pointer.moved = true;
            }}
            onPointerCancel={() => {
              togglePointer.current = null;
            }}
            onClick={(event) => {
              if (event.detail > 0 && togglePointer.current?.moved) return;
              toggleCollapsed(section.id);
            }}
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
            maw={labelMaxWidth}
            size="md"
            radius="sm"
            variant="default"
            c="var(--mantine-color-text)"
            style={{ zIndex: 9, pointerEvents: "none" }}
            title={options.title}
            data-board-container-label
          >
            {options.title}
          </Badge>
        )}
        {options.showOpenAll && !isEditMode && (
          <Box
            pos="absolute"
            top={isVisuallyCollapsed ? "50%" : labelTop}
            right={8}
            style={{ zIndex: 10, transform: isVisuallyCollapsed ? "translateY(-50%)" : undefined }}
          >
            {runtime.appsClient ? (
              <BoardSectionOpenAll
                client={runtime.appsClient}
                identity={runtime.identity}
                resources={runtime.resources}
                board={board}
                sectionId={section.id}
                layoutId={runtime.layout.id}
                label={label}
              />
            ) : runtime.renderOpenAll ? (
              runtime.renderOpenAll(section, board, runtime.layout.id)
            ) : (
              <ActionIcon
                disabled
                title="The app reader is not composed"
                aria-label={tSection("action.openAllInNewTabsFor", { name: label })}
              >
                <IconExternalLink size="var(--mantine-font-size-md)" />
              </ActionIcon>
            )}
          </Box>
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
          <ContainerDepthContext.Provider value={containerDepth + 1}>
            <SectionGrid
              section={section}
              columnCount={section.width}
              containerInlineInsetCount={containerInlineInsetCount}
              requestedRowCount={section.height}
              viewportRowCountOverride={isVisuallyCollapsed ? COLLAPSED_SECTION_ROW_COUNT : undefined}
              label={label}
            />
          </ContainerDepthContext.Provider>
        </Box>
        <BoardContainerMenu section={section} position={menuPosition} />
      </Card>
    </Box>
  );
};
