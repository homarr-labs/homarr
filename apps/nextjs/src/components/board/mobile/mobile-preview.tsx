"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Affix, Button, Center, Group, Paper, ScrollArea, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconDeviceMobile, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { getDesktopLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";
import { widgetCatalogIcons } from "@homarr/widgets/catalog";

import { useIsMobileBoard } from "../use-mobile-board";
import classes from "./mobile-preview.module.css";
import { createMobileBoardPreviewItems, mobileColumnCount } from "./mobile-layout";

export const MobileBoardPreview = () => {
  const [isEditMode] = useEditMode();
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobileBoard = useIsMobileBoard();
  const { enableAutomaticMobileLayout } = useSettings();
  const t = useI18n();

  useEffect(() => {
    if (!isEditMode || isMobileBoard || !enableAutomaticMobileLayout) {
      setIsExpanded(false);
    }
  }, [enableAutomaticMobileLayout, isEditMode, isMobileBoard]);

  if (!isEditMode || isMobileBoard || !enableAutomaticMobileLayout) return null;

  return (
    <Affix position={{ bottom: "var(--mantine-spacing-md)", left: "var(--mantine-spacing-md)" }} zIndex={200}>
      {isExpanded ? (
        <Paper className={classes.panel} radius="md" shadow="md" data-mobile-board-preview>
          <Group justify="space-between" wrap="nowrap" p="sm">
            <Group gap="xs" wrap="nowrap">
              <IconDeviceMobile size={20} aria-hidden />
              <Text fw={600}>{t("board.mobilePreview.title")}</Text>
            </Group>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setIsExpanded(false)}
              aria-label={t("board.mobilePreview.collapse")}
            >
              <IconX size={18} />
            </ActionIcon>
          </Group>
          <MobileBoardPreviewMap />
        </Paper>
      ) : (
        <Button
          leftSection={<IconDeviceMobile size={20} />}
          onClick={() => setIsExpanded(true)}
          data-mobile-board-preview-toggle
        >
          {t("board.mobilePreview.action")}
        </Button>
      )}
    </Affix>
  );
};

const MobileBoardPreviewMap = () => {
  const board = useRequiredBoard();
  const desktopLayout = getDesktopLayout(board);
  const items = useMemo(() => createMobileBoardPreviewItems(board, desktopLayout.id), [board, desktopLayout.id]);
  const appIds = useMemo(
    () => [...new Set(items.flatMap((item) => (item.appId === null ? [] : [item.appId])))],
    [items],
  );
  const { data: apps = [] } = clientApi.app.byIds.useQuery(appIds, { enabled: appIds.length > 0 });
  const appsById = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps]);
  const t = useI18n();

  return (
    <ScrollArea.Autosize className={classes.viewport} mah="calc(min(70vh, 700px) - 52px)" p="sm">
      {items.length === 0 ? (
        <Center mih={160}>
          <Stack gap={4} align="center">
            <IconDeviceMobile size={28} color="var(--mantine-color-dimmed)" aria-hidden />
            <Text size="sm" c="dimmed" ta="center">
              {t("board.mobilePreview.empty")}
            </Text>
          </Stack>
        </Center>
      ) : (
        <div
          className={classes.grid}
          style={{ "--mobile-column-count": mobileColumnCount } as CSSProperties}
          data-mobile-board-preview-grid
        >
          {items.map((item) => {
            const WidgetIcon = widgetCatalogIcons[item.kind];
            const app = item.appId === null ? undefined : appsById.get(item.appId);
            const label = app?.name ?? (item.title?.trim() || t(`widget.${item.kind}.name`));

            return (
              <div
                key={item.id}
                className={classes.item}
                style={{ gridColumn: `span ${item.width}`, gridRow: `span ${item.height}` }}
                data-mobile-board-preview-item={item.id}
              >
                <Group className={classes.itemContent} gap={6} wrap="nowrap" px="xs">
                  <ThemeIcon variant="light" size="sm" data-mobile-board-preview-app-icon={app?.id}>
                    {app ? (
                      <MaskedOrNormalImage imageUrl={app.iconUrl} hasColor={false} alt="" className={classes.appIcon} />
                    ) : (
                      <WidgetIcon size={14} aria-hidden />
                    )}
                  </ThemeIcon>
                  <Text size="xs" fw={500} truncate title={label}>
                    {label}
                  </Text>
                </Group>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea.Autosize>
  );
};
