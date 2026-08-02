import dynamic from "next/dynamic";
import { ActionIcon, Badge, Box, Button, Card } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconExternalLink, IconGripVertical } from "@tabler/icons-react";
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
  const labelLeft = options.collapsible && !isEditMode ? 40 : 8;
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
        {isVisuallyCollapsed && (
          <Button
            pos="absolute"
            top={0}
            left={0}
            maw={`calc(100% - ${options.showOpenAll ? 40 : 0}px)`}
            size="compact-sm"
            radius="xl"
            variant="default"
            leftSection={<IconChevronDown size={14} />}
            onClick={toggle}
            aria-expanded={false}
            aria-controls={contentId}
            aria-label={`${t("action.expand")}: ${label}`}
            data-board-container-collapsed-control
            styles={{
              label: {
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          >
            {label}
          </Button>
        )}
        {isEditMode && (
          <ActionIcon
            component="span"
            pos="absolute"
            top={4}
            left={4}
            style={{ zIndex: 10, cursor: "grab", touchAction: "none" }}
            variant="default"
            size={24}
            radius="sm"
            data-grid-container-drag-handle
            aria-hidden="true"
          >
            <IconGripVertical size={16} />
          </ActionIcon>
        )}
        {!isVisuallyCollapsed && options.showLabel && options.title && (
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
        {options.collapsible && !isEditMode && !isVisuallyCollapsed && (
          <ActionIcon
            pos="absolute"
            top={-24}
            left={4}
            style={{ zIndex: 10 }}
            variant="default"
            size={24}
            radius="sm"
            onClick={toggle}
            aria-expanded={!isVisuallyCollapsed}
            aria-controls={contentId}
            aria-label={`${isVisuallyCollapsed ? t("action.expand") : t("action.collapse")}: ${label}`}
          >
            <IconChevronUp size={16} />
          </ActionIcon>
        )}
        {options.showOpenAll && !isEditMode && (
          <ActionIcon
            pos="absolute"
            top={isVisuallyCollapsed ? 0 : -24}
            right={4}
            style={{ zIndex: 10 }}
            variant="default"
            size={24}
            radius="sm"
            loading={areAppsLoading}
            onClick={openAllInNewTabs}
            aria-label={tAll("section.action.openAllInNewTabsFor", { name: label })}
          >
            <IconExternalLink size={16} />
          </ActionIcon>
        )}
        <Box id={contentId} h="100%" hidden={isVisuallyCollapsed}>
          {!isVisuallyCollapsed && (
            <SectionGrid
              section={section}
              columnCount={section.width}
              requestedRowCount={section.height}
              label={label}
            />
          )}
        </Box>
      </Card>
      {isEditMode && <BoardContainerMenu section={section} />}
    </Box>
  );
};
