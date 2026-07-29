"use client";

import type { MutableRefObject } from "react";
import { useMemo, useRef } from "react";
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
import { useHasNestedDialog } from "./mobile-dialog-stack";
import classes from "./mobile-board.module.css";
import { isMobileContextActionVisible, shouldRenderMobileWidgetActions } from "./mobile-presentation";

interface MobileWidgetActionsProps {
  item: SectionItem;
  supportsDetails: boolean;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
}

export const MobileWidgetActions = ({ item, supportsDetails, widgetStateRef }: MobileWidgetActionsProps) => {
  const [actionsOpened, actionsDisclosure] = useDisclosure(false);
  const [detailsOpened, detailsDisclosure] = useDisclosure(false);
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailsDialogRef = useRef<HTMLDivElement | null>(null);
  const openDetailsAfterActionsRef = useRef(false);
  const hasNestedDialog = useHasNestedDialog(detailsOpened, detailsDialogRef);
  const t = useI18n();
  const settings = useSettings();
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const definition = widgetImports[item.kind].definition;
  const queryKey = "queryKey" in definition ? (definition.queryKey as QueryKey | undefined) : undefined;
  const options = useMemo(
    () => reduceWidgetOptionsWithDefaultValues(item.kind, settings, item.options) as Record<string, unknown>,
    [item.kind, item.options, settings],
  );
  const contextActions = useMemo(() => {
    if (!("contextActions" in definition) || typeof definition.contextActions !== "function") return [];

    return definition.contextActions({
      options,
      setOptions: () => undefined,
      integrationIds: item.integrationIds,
      context: { isEditMode, boardId: board.id, itemId: item.id },
      widgetStateRef,
    } as never) as WidgetContextMenuAction[];
  }, [board.id, definition, isEditMode, item.id, item.integrationIds, options, widgetStateRef]);
  const visibleContextActions = contextActions.filter(isMobileContextActionVisible);
  const title = item.advancedOptions.title?.trim() || t(`widget.${item.kind}.name`);
  const hasActions = shouldRenderMobileWidgetActions({
    supportsDetails,
    supportsRefresh: queryKey !== undefined,
    visibleContextActionCount: visibleContextActions.length,
  });

  if (!hasActions) return null;

  return (
    <>
      <ActionIcon
        ref={actionTriggerRef}
        className={classes.widgetAction}
        variant="filled"
        color="dark"
        radius="xl"
        size={44}
        aria-label={t("board.mobile.actions", { title })}
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
        styles={{
          content: {
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          },
        }}
        onExitTransitionEnd={() => {
          if (!openDetailsAfterActionsRef.current) return;
          openDetailsAfterActionsRef.current = false;
          detailsDisclosure.open();
        }}
        closeButtonProps={{
          "aria-label": t("common.action.close"),
          size: 44,
        }}
      >
        <Stack gap="xs" pb="calc(var(--mantine-spacing-sm) + env(safe-area-inset-bottom))">
          {supportsDetails && (
            <Button
              variant="subtle"
              justify="flex-start"
              size="lg"
              leftSection={<IconMaximize size={20} />}
              onClick={() => {
                openDetailsAfterActionsRef.current = true;
                actionsDisclosure.close();
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
          {queryKey && <MobileWidgetRefreshAction queryKey={queryKey} onComplete={actionsDisclosure.close} />}
        </Stack>
      </Drawer>

      <Modal
        ref={detailsDialogRef}
        opened={detailsOpened}
        onClose={detailsDisclosure.close}
        title={title}
        fullScreen
        padding="md"
        returnFocus={false}
        trapFocus={!hasNestedDialog}
        closeOnEscape={!hasNestedDialog}
        onExitTransitionEnd={() => actionTriggerRef.current?.focus()}
        closeButtonProps={{
          "aria-label": t("common.action.close"),
          size: 44,
        }}
        styles={{
          content: {
            display: "flex",
            flexDirection: "column",
            height: "100dvh",
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          },
          body: {
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            paddingBottom: "calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))",
          },
        }}
      >
        <Box className={classes.detailContent}>
          <BoardItemContent
            item={item}
            displayMode="mobileDetail"
            disableContextMenu
            isReadOnly
            widgetStateRef={widgetStateRef}
          />
        </Box>
      </Modal>
    </>
  );
};

const MobileWidgetRefreshAction = ({ queryKey, onComplete }: { queryKey: QueryKey; onComplete: () => void }) => {
  const t = useI18n();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey }) > 0;

  return (
    <Button
      variant="subtle"
      justify="flex-start"
      size="lg"
      disabled={isFetching}
      leftSection={isFetching ? <Loader size={20} /> : <IconRefresh size={20} />}
      onClick={() => {
        void queryClient.refetchQueries({ queryKey, type: "all" });
        onComplete();
      }}
    >
      {t("item.menu.label.refresh")}
    </Button>
  );
};
