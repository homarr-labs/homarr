import type { PointerEvent, MouseEvent } from "react";
import { createContext, useContext, useRef } from "react";
import dynamic from "next/dynamic";
import { ActionIcon, Badge, Box, Button, Card } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "@tabler/icons-react";
import combineClasses from "clsx";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getRootSectionLane } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { ContainerSectionItem } from "~/app/[locale]/boards/_types";
import { CONTAINER_HEADER_HEIGHT } from "~/components/board/layout";
import { useFitContentReporter } from "./auto-expand/fit-to-content";
import { SectionGrid } from "./grid/section-grid";
import { useAutoExpandTargetSectionIds, useIsAutoExpanded, useSectionCollapse } from "./section-collapse";
import { useSectionContext } from "./section-context";
import { useOpenSectionApps } from "./use-open-section-apps";
import classes from "./item.module.css";

const BoardContainerEditBar = dynamic(
  () => import("./container/container-menu").then((module) => module.BoardContainerEditBar),
  { ssr: false },
);

const ContainerDepthContext = createContext(0);

interface Props {
  section: ContainerSectionItem;
}

export const BoardContainerSection = ({ section }: Props) => {
  const board = useRequiredBoard();
  const togglePointer = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const containerDepth = useContext(ContainerDepthContext);
  const parent = useSectionContext();
  let containerInlineInsetCount = 2;
  if (parent.section.kind === "empty" && getRootSectionLane(parent.section.xOffset) !== "main") {
    if (section.xOffset === 0) containerInlineInsetCount -= 1;
    if (section.xOffset + section.width === parent.columnCount) containerInlineInsetCount -= 1;
  }
  const [isEditMode] = useEditMode();
  const t = useI18n("section.container");
  const tSection = useI18n("section");
  const options = section.options;
  const hasAutoExpandTarget = useAutoExpandTargetSectionIds().has(section.id);
  const usesHiddenAutoExpand = hasAutoExpandTarget && options.autoExpand.inactiveDisplay === "hidden";
  const showCollapseToggle = options.collapsible && !usesHiddenAutoExpand;
  const hasHeader = showCollapseToggle && options.showLabel;
  const { open: openAllInNewTabs, isLoading: areAppsLoading } = useOpenSectionApps(
    section.id,
    options.showOpenAll && !isEditMode,
  );
  const { isVisuallyCollapsed, toggle } = useSectionCollapse({
    sectionId: section.id,
    collapsible: options.collapsible,
  });
  const isAutoExpanded = useIsAutoExpanded(section.id);
  const isHiddenInactive = usesHiddenAutoExpand && !isAutoExpanded && !isEditMode;
  const effectivelyCollapsed = isVisuallyCollapsed || isHiddenInactive;
  const fitsContent =
    options.autoExpand.enabled &&
    options.autoExpand.fitToContent &&
    isAutoExpanded &&
    !isEditMode &&
    !effectivelyCollapsed;
  const bodyRef = useRef<HTMLDivElement>(null);
  useFitContentReporter({ sectionId: section.id, itemId: options.autoExpand.itemId, bodyRef, enabled: fitsContent });
  const label = options.title.trim() || t("untitled");
  const contentId = `board-container-${section.id}-content`;
  const labelTop = "calc(var(--mantine-spacing-xs) * -1)";
  const labelLeft = 8;
  const labelRight = options.showOpenAll && !isEditMode ? 40 : 8;
  const labelMaxWidth = `calc(100% - ${labelLeft + labelRight}px)`;
  // The native toggle spans the header; sibling actions stay above it.
  const toggleLayout = isVisuallyCollapsed
    ? { top: 0, left: 0, w: "100%", h: "100%", maw: "100%" }
    : {
        top: labelTop,
        left: 0,
        w: "100%",
        h: 20,
        maw: "100%",
      };
  const toggleIcon = isVisuallyCollapsed ? (
    <IconChevronDown size="var(--mantine-font-size-md)" />
  ) : (
    <IconChevronUp size="var(--mantine-font-size-md)" />
  );
  const toggleHandlers = {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      togglePointer.current = { x: event.clientX, y: event.clientY, moved: false };
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const pointer = togglePointer.current;
      if (!pointer || event.buttons === 0) return;
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) {
        pointer.moved = true;
      }
    },
    onPointerCancel: () => {
      togglePointer.current = null;
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail > 0 && togglePointer.current?.moved) return;
      toggle();
    },
  };

  return (
    <Box
      className="board-grid-item-content"
      data-grid-item-content
      w="100%"
      h="100%"
      style={{
        overflow: "visible",
      }}
    >
      <Card
        className={combineClasses(
          classes.itemCard,
          classes.containerCard,
          options.customCssClasses.join(" "),
          effectivelyCollapsed && !hasHeader && classes.collapsedContainerCard,
          hasHeader && classes.labeledContainerCard,
        )}
        w="100%"
        h="100%"
        data-board-container-collapsed={effectivelyCollapsed ? "true" : "false"}
        styles={{
          root: {
            overflow: "visible",
            "--opacity": board.opacity / 100,
            "--container-border-color": options.borderColor || undefined,
            "--container-header-height": `calc(${CONTAINER_HEADER_HEIGHT}px * var(--board-canvas-ui-scale, 1))`,
          },
        }}
        radius={board.itemRadius}
        p={0}
      >
        {hasHeader && (
          <div className={classes.containerHeader} data-board-container-header>
            <button
              type="button"
              className={classes.containerHeaderToggle}
              data-board-container-label
              data-board-container-collapsed-control={isVisuallyCollapsed ? "true" : undefined}
              {...toggleHandlers}
              aria-expanded={!isVisuallyCollapsed}
              aria-controls={contentId}
              aria-label={`${t(isVisuallyCollapsed ? "action.expand" : "action.collapse")}: ${label}`}
              title={label}
            >
              <span className={classes.containerHeaderTitle}>{label}</span>
              <span className={classes.containerHeaderIcon}>{toggleIcon}</span>
            </button>
          </div>
        )}
        {showCollapseToggle && !hasHeader && (
          <Button
            className={classes.containerToggle}
            pos="absolute"
            {...toggleLayout}
            px={6}
            ps={labelLeft}
            pe={labelRight}
            radius="sm"
            variant="default"
            justify="center"
            {...toggleHandlers}
            aria-expanded={!isVisuallyCollapsed}
            aria-controls={contentId}
            aria-label={`${t(isVisuallyCollapsed ? "action.expand" : "action.collapse")}: ${label}`}
            data-board-container-collapsed-control={isVisuallyCollapsed ? "true" : undefined}
            data-board-container-label
          >
            {toggleIcon}
          </Button>
        )}
        {!isEditMode &&
          !isVisuallyCollapsed &&
          !showCollapseToggle &&
          !isHiddenInactive &&
          options.showLabel &&
          options.title && (
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
        {options.showOpenAll && !isEditMode && !isHiddenInactive && (
          <ActionIcon
            className={classes.containerAction}
            pos="absolute"
            top={isVisuallyCollapsed ? "50%" : labelTop}
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
          ref={bodyRef}
          id={contentId}
          className={classes.containerBody}
          h="100%"
          data-board-container-body
          data-collapsed={effectivelyCollapsed ? "true" : "false"}
          aria-hidden={effectivelyCollapsed}
          inert={effectivelyCollapsed}
        >
          <ContainerDepthContext value={containerDepth + 1}>
            <SectionGrid
              section={section}
              columnCount={section.width}
              containerInlineInsetCount={containerInlineInsetCount}
              requestedRowCount={section.height}
              viewportRowCountOverride={isVisuallyCollapsed ? section.height : isHiddenInactive ? 0 : undefined}
              fittedViewportRowCount={fitsContent ? section.height : undefined}
              label={label}
            />
          </ContainerDepthContext>
        </Box>
        {isEditMode && <BoardContainerEditBar section={section} placement={hasHeader ? "header" : "border"} />}
      </Card>
    </Box>
  );
};
