"use client";

import { Badge, Box, Group, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";
import { widgetCatalogIcons } from "@homarr/widgets/catalog";

import type { Board } from "../../_types";
import type { BoardLayout } from "../../_layout-utils";
import { getRepresentativeLayoutWidth, projectBoardLayout } from "../../_layout-utils";
import classes from "./_layout-preview.module.css";

interface Props {
  board: Board;
  layout: BoardLayout;
  layouts: BoardLayout[];
  sourceLayout: Pick<BoardLayout, "id" | "columnCount">;
  apps: RouterOutputs["app"]["byIds"];
}

export const LayoutPreview = ({ board, layout, layouts, sourceLayout, apps }: Props) => {
  const t = useI18n();
  const elements = projectBoardLayout(board, sourceLayout, layout);
  const representativeWidth = getRepresentativeLayoutWidth(layout, layouts);
  const largestRepresentativeWidth = Math.max(
    ...layouts.map((candidate) => getRepresentativeLayoutWidth(candidate, layouts)),
  );
  const previewWidth = `${(representativeWidth / largestRepresentativeWidth) * 100}%`;
  const appsById = new Map(apps.map((app) => [app.id, app]));
  const rootSections = board.sections
    .filter((section) => section.kind !== "dynamic")
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

  return (
    <Stack gap={6} align="center" w="100%">
      <Group gap="xs" justify="center">
        <Badge variant="light" color={layout.role === "mobile" ? "teal" : layout.role === "base" ? "blue" : "gray"}>
          {representativeWidth}px
        </Badge>
        <Text size="xs">
          {layout.columnCount} {t("board.setting.section.layout.preview.columns")}
        </Text>
      </Group>
      <Box w={{ base: "100%", md: previewWidth }} maw="100%" className={classes.canvas}>
        {elements.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="xl">
            {t("board.setting.section.layout.preview.empty")}
          </Text>
        ) : (
          <Stack gap="xs">
            {rootSections.map((section) => {
              const sectionElements = elements.filter((element) => element.sectionId === section.id);
              if (sectionElements.length === 0) return null;

              return (
                <Stack key={section.id} gap={4} className={classes.section}>
                  {section.kind === "category" && (
                    <Text size="xs" fw={600}>
                      {section.name}
                    </Text>
                  )}
                  <Box
                    className={classes.grid}
                    style={{ gridTemplateColumns: `repeat(${layout.columnCount}, minmax(0, 1fr))` }}
                  >
                    {sectionElements.map((element) => {
                      const item =
                        element.type === "item" ? board.items.find((candidate) => candidate.id === element.id) : null;
                      const appId =
                        item?.kind === "app" && typeof item.options.appId === "string" ? item.options.appId : null;
                      const app = appId ? appsById.get(appId) : undefined;
                      const dynamicSection =
                        element.type === "section"
                          ? board.sections.find((candidate) => candidate.id === element.id)
                          : undefined;
                      const dynamicSectionLabel =
                        dynamicSection?.kind === "dynamic" && dynamicSection.options.title
                          ? dynamicSection.options.title
                          : t("board.setting.section.layout.preview.dynamicSection");
                      const label = app?.name ?? (item ? t(`widget.${item.kind}.name`) : dynamicSectionLabel);
                      const WidgetIcon = item ? widgetCatalogIcons[item.kind] : IconLayoutGrid;

                      return (
                        <Tooltip key={`${element.type}-${element.id}`} label={label} openDelay={350}>
                          <Box
                            role="img"
                            aria-label={label}
                            className={`${classes.tile} ${element.type === "section" ? classes.dynamicTile : ""}`}
                            style={{
                              gridColumn: `${element.xOffset + 1} / span ${element.width}`,
                              gridRow: `${element.yOffset + 1} / span ${element.height}`,
                            }}
                          >
                            <Group gap={4} wrap="nowrap" className={classes.tileContent}>
                              <ThemeIcon size="sm" variant="light" radius="sm" style={{ flexShrink: 0 }}>
                                {app ? (
                                  <MaskedOrNormalImage
                                    imageUrl={app.iconUrl}
                                    hasColor={false}
                                    alt=""
                                    className={classes.appIcon}
                                  />
                                ) : (
                                  <WidgetIcon size={13} stroke={1.7} />
                                )}
                              </ThemeIcon>
                              <Text component="span" size="xs" fw={500} className={classes.tileLabel}>
                                {label}
                              </Text>
                            </Group>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
};
