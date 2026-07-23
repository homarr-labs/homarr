"use client";

import type { MutableRefObject } from "react";
import { useMemo } from "react";
import { ActionIcon, Box, Button, Drawer, Loader, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDotsVertical, IconMaximize, IconRefresh } from "@tabler/icons-react";
import type { QueryKey } from "@tanstack/react-query";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useSettings } from "@homarr/settings";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { WidgetContextMenuAction } from "@homarr/widgets";
import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { BoardItemContent } from "../items/item-content";
import { useItemActions } from "../items/item-actions";
import classes from "./mobile-board.module.css";

interface MobileWidgetActionsProps {
  item: SectionItem;
  supportsDetails: boolean;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
}

export const MobileWidgetActions = ({ item, supportsDetails, widgetStateRef }: MobileWidgetActionsProps) => {
  const [actionsOpened, actionsDisclosure] = useDisclosure(false);
  const [detailsOpened, detailsDisclosure] = useDisclosure(false);
  const t = useI18n();
  const settings = useSettings();
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const { updateItemOptions } = useItemActions();
  const definition = widgetImports[item.kind].definition;
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ("queryKey" in definition ? (definition.queryKey as QueryKey) : [["widget", item.kind]]),
    [definition, item.kind],
  );
  const isFetching = useIsFetching({ queryKey }) > 0;
  const options = useMemo(
    () => reduceWidgetOptionsWithDefaultValues(item.kind, settings, item.options) as Record<string, unknown>,
    [item.kind, item.options, settings],
  );
  const contextActions = useMemo(() => {
    if (!("contextActions" in definition) || typeof definition.contextActions !== "function") return [];

    return definition.contextActions({
      options,
      setOptions: (partial: Record<string, unknown>) =>
        updateItemOptions({
          itemId: item.id,
          newOptions: { ...options, ...partial },
        }),
      integrationIds: item.integrationIds,
      context: { isEditMode, boardId: board.id, itemId: item.id },
      widgetStateRef,
    } as never) as WidgetContextMenuAction[];
  }, [board.id, definition, isEditMode, item.id, item.integrationIds, options, updateItemOptions, widgetStateRef]);
  const visibleContextActions = contextActions.filter((action) => !action.hidden);
  const title = item.advancedOptions.title?.trim() || t(`widget.${item.kind}.name`);
  const hasActions = item.kind !== "app" || supportsDetails || visibleContextActions.length > 0;

  if (!hasActions) return null;

  const refresh = () => {
    void queryClient.refetchQueries({ queryKey, type: "all" });
    actionsDisclosure.close();
  };

  return (
    <>
      <ActionIcon
        className={classes.widgetAction}
        variant="filled"
        color="dark"
        radius="xl"
        size={44}
        aria-label={t("board.mobile.actions")}
        onClick={actionsDisclosure.open}
      >
        <IconDotsVertical size={20} />
      </ActionIcon>

      <Drawer
        opened={actionsOpened}
        onClose={actionsDisclosure.close}
        title={title}
        position="bottom"
        size="auto"
        padding="md"
        overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      >
        <Stack gap="xs" pb="calc(var(--mantine-spacing-sm) + env(safe-area-inset-bottom))">
          {supportsDetails && (
            <Button
              variant="subtle"
              justify="flex-start"
              size="lg"
              leftSection={<IconMaximize size={20} />}
              onClick={() => {
                actionsDisclosure.close();
                detailsDisclosure.open();
              }}
            >
              {t("board.mobile.details")}
            </Button>
          )}
          {visibleContextActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.key}
                variant="subtle"
                color={action.color}
                justify="flex-start"
                size="lg"
                disabled={action.disabled}
                leftSection={Icon ? <Icon size={20} /> : undefined}
                onClick={() => {
                  action.onClick();
                  actionsDisclosure.close();
                }}
              >
                {String(translateIfNecessary(t, action.label))}
              </Button>
            );
          })}
          <Button
            variant="subtle"
            justify="flex-start"
            size="lg"
            disabled={isFetching}
            leftSection={isFetching ? <Loader size={20} /> : <IconRefresh size={20} />}
            onClick={refresh}
          >
            {t("item.menu.label.refresh")}
          </Button>
        </Stack>
      </Drawer>

      <Modal
        opened={detailsOpened}
        onClose={detailsDisclosure.close}
        title={title}
        fullScreen
        padding="md"
        styles={{
          body: {
            height: "calc(100dvh - 4rem)",
            overflowY: "auto",
            paddingBottom: "calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))",
          },
        }}
      >
        <Box className={classes.detailContent}>
          <BoardItemContent item={item} displayMode="mobileDetail" disableContextMenu widgetStateRef={widgetStateRef} />
        </Box>
      </Modal>
    </>
  );
};
