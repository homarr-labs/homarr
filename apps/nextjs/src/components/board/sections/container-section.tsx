import dynamic from "next/dynamic";
import { ActionIcon, Badge, Box, Button, Card } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "@tabler/icons-react";
import combineClasses from "clsx";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type { ContainerSectionItem } from "~/app/[locale]/boards/_types";
import { SectionGrid } from "./grid/section-grid";
import { useSectionCollapse } from "./section-collapse";
import { useOpenSectionApps } from "./use-open-section-apps";
import classes from "./item.module.css";

const BoardContainerMenu = dynamic(
  () => import("./container/container-menu").then((module) => module.BoardContainerMenu),
  { ssr: false },
);

interface Props {
  section: ContainerSectionItem;
}

export const BoardContainerSection = ({ section }: Props) => {
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const t = useScopedI18n("section.container");
  const tAll = useI18n();
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
  const labelLeft = 8;
  const labelRight = isEditMode ? 48 : options.showOpenAll ? 40 : 8;

  return (
    <Box className="board-grid-item-content" data-grid-item-content w="100%" h="100%" style={{ overflow: "visible" }}>
      <Card
        className={combineClasses(
          classes.itemCard,
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
            "--border-color": options.borderColor || undefined,
          },
        }}
        radius={board.itemRadius}
        p={0}
      >
        {options.collapsible && !isEditMode && (
          <Button
            className={classes.containerToggle}
            pos="absolute"
            top={isVisuallyCollapsed ? 0 : -24}
            left={0}
            w="100%"
            h={isVisuallyCollapsed ? "100%" : 24}
            px={12}
            pe={options.showOpenAll ? 40 : 12}
            radius="sm"
            variant="default"
            justify={options.showLabel ? "flex-start" : "center"}
            leftSection={
              options.showLabel ? (
                isVisuallyCollapsed ? (
                  <IconChevronDown size={16} />
                ) : (
                  <IconChevronUp size={16} />
                )
              ) : undefined
            }
            onClick={toggle}
            aria-expanded={!isVisuallyCollapsed}
            aria-controls={contentId}
            aria-label={`${t(isVisuallyCollapsed ? "action.expand" : "action.collapse")}: ${label}`}
            data-board-container-collapsed-control={isVisuallyCollapsed ? "true" : undefined}
            data-board-container-label
            title={options.showLabel ? label : undefined}
          >
            {options.showLabel ? (
              label
            ) : isVisuallyCollapsed ? (
              <IconChevronDown size={16} />
            ) : (
              <IconChevronUp size={16} />
            )}
          </Button>
        )}
        {!isVisuallyCollapsed && (!options.collapsible || isEditMode) && options.showLabel && options.title && (
          <Badge
            pos="absolute"
            top={-24}
            left={labelLeft}
            maw={`calc(100% - ${labelLeft + labelRight}px)`}
            size="md"
            radius="sm"
            variant="default"
            c="var(--mantine-color-text)"
            style={{
              zIndex: 9,
              overflow: "hidden",
              pointerEvents: "none",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              backgroundColor: "var(--background-color)",
              borderColor: "var(--border-color)",
            }}
            title={options.title}
            data-board-container-label
          >
            {options.title}
          </Badge>
        )}
        {options.showOpenAll && !isEditMode && (
          <ActionIcon
            pos="absolute"
            top={isVisuallyCollapsed ? "50%" : -24}
            right={8}
            style={{ zIndex: 10, transform: isVisuallyCollapsed ? "translateY(-50%)" : undefined }}
            variant={options.collapsible ? "subtle" : "default"}
            size={24}
            radius="sm"
            loading={areAppsLoading}
            onClick={openAllInNewTabs}
            aria-label={tAll("section.action.openAllInNewTabsFor", { name: label })}
          >
            <IconExternalLink size={16} />
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
          <SectionGrid section={section} columnCount={section.width} requestedRowCount={section.height} label={label} />
        </Box>
      </Card>
      {isEditMode && <BoardContainerMenu section={section} />}
    </Box>
  );
};
