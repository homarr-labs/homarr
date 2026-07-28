"use client";

import type { MutableRefObject } from "react";
import { useMemo, useRef, useState } from "react";
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
import {
  isMobileContextActionVisible,
  shouldKeepMobileWidgetActionsMounted,
  shouldRenderMobileWidgetActions,
} from "./mobile-presentation";

interface MobileWidgetActionsProps {
  item: SectionItem;
  supportsDetails: boolean;
  detailsFromCard: boolean;
  detailsOpened: boolean;
  openDetails: () => void;
  closeDetails: () => void;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
  isNearViewport: boolean;
}

export const MobileWidgetActions = ({
  item,
  supportsDetails,
  detailsFromCard,
  detailsOpened,
  openDetails,
  closeDetails,
  widgetStateRef,
  isNearViewport,
}: MobileWidgetActionsProps) => {
  const [actionsOpened, actionsDisclosure] = useDisclosure(false);
  const [isOpeningDetails, setIsOpeningDetails] = useState(false);
  const [isCompletingAction, setIsCompletingAction] = useState(false);
  const [actionTriggerHasFocus, setActionTriggerHasFocus] = useState(false);
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailsDialogRef = useRef<HTMLDivElement | null>(null);
  const pendingContextActionRef = useRef<(() => void) | null>(null);
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
    supportsDetails: supportsDetails && !detailsFromCard,
    supportsRefresh: queryKey !== undefined,
    visibleContextActionCount: visibleContextActions.length,
  });
  const shouldKeepMounted = shouldKeepMobileWidgetActionsMounted({
    isNearViewport,
    actionsOpened,
    detailsOpened,
    isOpeningDetails,
    isCompletingAction,
    actionTriggerHasFocus,
  });

  if ((!hasActions && !detailsOpened) || !shouldKeepMounted) return null;

  return (
    <>
      {hasActions && (
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
            onFocus={() => setActionTriggerHasFocus(true)}
            onBlur={() => setActionTriggerHasFocus(false)}
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
            returnFocus={false}
            styles={{
              content: {
                paddingLeft: "env(safe-area-inset-left)",
                paddingRight: "env(safe-area-inset-right)",
              },
            }}
            onExitTransitionEnd={() => {
              if (isOpeningDetails) {
                setIsOpeningDetails(false);
                openDetails();
                return;
              }

              const pendingContextAction = pendingContextActionRef.current;
              if (pendingContextAction) {
                pendingContextActionRef.current = null;
                setIsCompletingAction(false);
                pendingContextAction();
                return;
              }

              actionTriggerRef.current?.focus();
            }}
            closeButtonProps={{
              "aria-label": t("common.action.close"),
              size: 44,
            }}
          >
            <Stack gap="xs" pb="calc(var(--mantine-spacing-sm) + env(safe-area-inset-bottom))">
              {supportsDetails && !detailsFromCard && (
                <Button
                  variant="subtle"
                  justify="flex-start"
                  size="lg"
                  leftSection={<IconMaximize size={20} />}
                  onClick={() => {
                    setIsOpeningDetails(true);
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
                      pendingContextActionRef.current = action.onClick;
                      setIsCompletingAction(true);
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
        </>
      )}

      {supportsDetails && (
        <Modal
          ref={detailsDialogRef}
          opened={detailsOpened}
          onClose={closeDetails}
          title={title}
          fullScreen
          padding="md"
          returnFocus={detailsFromCard}
          trapFocus={!hasNestedDialog}
          closeOnEscape={!hasNestedDialog}
          aria-hidden={hasNestedDialog || undefined}
          inert={hasNestedDialog || undefined}
          onExitTransitionEnd={() => {
            if (!detailsFromCard) {
              actionTriggerRef.current?.focus();
            }
          }}
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
              disableItemConfiguration
              widgetStateRef={widgetStateRef}
            />
          </Box>
        </Modal>
      )}
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
