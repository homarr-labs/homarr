"use client";

import { useMemo } from "react";
import { Badge, ColorSwatch, Group, Stack, Text, Tooltip } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import type { BoardPreviewLayout } from "@homarr/boards/layout-preview";
import { getRepresentativeLayoutWidth } from "@homarr/boards/layout-preview";
import { useI18n } from "@homarr/translation/client";

import { BoardLayoutThumbnail } from "~/components/board/board-layout-thumbnail";
import { normalizeFixedItemSize } from "~/components/board/layout/scaling";
import type { Board } from "../../_types";
import type { FormValues } from "./_settings-form";
import classes from "./_layout-preview.module.css";

interface Props {
  board: Board;
  layout: BoardPreviewLayout;
  layouts: BoardPreviewLayout[];
  sourceLayout: BoardPreviewLayout;
  apps: RouterOutputs["app"]["byIds"];
  settings: FormValues;
}

export const LayoutPreview = ({ board, layout, layouts, sourceLayout, apps, settings }: Props) => {
  const t = useI18n("board.setting.section.layout.preview");
  const tBoard = useI18n("board");
  const preview = useMemo(() => {
    const appsById = new Map(apps.map((app) => [app.id, app]));
    return {
      layouts,
      sections: board.sections,
      items: board.items.map((item) => {
        let iconUrl: string | undefined;
        if (item.kind === "app" && typeof item.options.appId === "string")
          iconUrl = appsById.get(item.options.appId)?.iconUrl;
        return { ...item, iconUrl };
      }),
    };
  }, [board, layouts, apps]);

  return (
    <Stack gap="xs" className={classes.preview} data-testid="board-layout-preview">
      <Group justify="space-between" gap="xs">
        <Text size="sm" fw={600}>
          {t("title")}
        </Text>
        <Badge variant="light" size="sm">
          {Math.max(320, getRepresentativeLayoutWidth(layout, layouts))} px
        </Badge>
      </Group>
      <BoardLayoutThumbnail preview={preview} label={t("canvasLabel")} canvas={{ layout, sourceLayout, settings }} />
      <Group justify="space-between" gap="xs">
        <Text size="xs" c="dimmed">
          {settings.fixedScaling
            ? t("dimensions", { size: normalizeFixedItemSize(settings.fixedItemSize), columns: layout.columnCount })
            : t("responsiveDimensions", { columns: layout.columnCount })}
        </Text>
        <Group gap={6}>
          <Tooltip label={tBoard("field.primaryColor.label")}>
            <ColorSwatch color={settings.primaryColor} size={16} aria-hidden />
          </Tooltip>
          <Tooltip label={tBoard("field.secondaryColor.label")}>
            <ColorSwatch color={settings.secondaryColor} size={16} aria-hidden />
          </Tooltip>
        </Group>
      </Group>
      <Text size="xs" c="dimmed">
        {t("description")}
      </Text>
    </Stack>
  );
};
