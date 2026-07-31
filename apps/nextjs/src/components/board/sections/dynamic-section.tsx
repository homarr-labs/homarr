import dynamic from "next/dynamic";
import { ActionIcon, Badge, Box, Card } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "@tabler/icons-react";
import combineClasses from "clsx";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type { DynamicSectionItem } from "~/app/[locale]/boards/_types";
import { SectionGrid } from "./grid/section-grid";
import { useSectionCollapse } from "./section-collapse";
import { useOpenSectionApps } from "./use-open-section-apps";
import classes from "./item.module.css";

const BoardDynamicSectionMenu = dynamic(
  () => import("./dynamic/dynamic-menu").then((module) => module.BoardDynamicSectionMenu),
  { ssr: false },
);

interface Props {
  section: DynamicSectionItem;
}

export const BoardDynamicSection = ({ section }: Props) => {
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const t = useScopedI18n("section.dynamic");
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
  const label = options.title || t("action.create");
  const contentId = `board-section-${section.id}-content`;
  const labelLeft = !isEditMode && options.collapsible ? 40 : 10;
  const labelRight = isEditMode ? 48 : options.showOpenAll ? 40 : 8;

  return (
    <Box
      className="grid-stack-item-content"
      data-grid-item-content
      w="100%"
      h="100%"
      style={{
        overflow: "visible",
      }}
    >
      <Card
        className={combineClasses(classes.itemCard, section.options.customCssClasses.join(" "))}
        w="100%"
        h="100%"
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
        {options.showLabel && options.title && (
          <Badge
            pos="absolute"
            top={6}
            left={labelLeft}
            maw={`calc(100% - ${labelLeft + labelRight}px)`}
            size="md"
            radius={board.itemRadius}
            color="var(--background-color)"
            c="var(--mantine-color-text)"
            bd="1px solid var(--border-color)"
            style={{ zIndex: 9, pointerEvents: "none" }}
          >
            {options.title}
          </Badge>
        )}
        {options.collapsible && !isEditMode && (
          <ActionIcon
            pos="absolute"
            top={4}
            left={4}
            style={{ zIndex: 10 }}
            variant="default"
            radius="xl"
            onClick={toggle}
            aria-expanded={!isVisuallyCollapsed}
            aria-controls={contentId}
            aria-label={`${isVisuallyCollapsed ? t("action.expand") : t("action.collapse")}: ${label}`}
          >
            {isVisuallyCollapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
          </ActionIcon>
        )}
        {options.showOpenAll && !isEditMode && (
          <ActionIcon
            pos="absolute"
            top={4}
            right={4}
            style={{ zIndex: 10 }}
            variant="default"
            radius="xl"
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
      {isEditMode && <BoardDynamicSectionMenu section={section} />}
    </Box>
  );
};
