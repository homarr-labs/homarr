"use client";

import type { ReactNode, RefObject } from "react";
import { useCallback, useMemo, useState } from "react";
import { Group, Loader, Menu, Text, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCopy,
  IconLayoutKanban,
  IconMaximize,
  IconRefresh,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess, useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { usePersistBoard } from "@homarr/boards/updater";
import { useTimeAgo } from "@homarr/common";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { TranslationFunction } from "@homarr/translation";
import type { WidgetDefinition, WidgetRuntimeRef } from "@homarr/widgets";
import {
  getWidgetQueryKeys,
  getWidgetRuntimeQueries,
  reduceWidgetOptionsWithDefaultValues,
  supportsAdvancedFocus,
  widgetImports,
} from "@homarr/widgets";
import { WidgetEditModal } from "@homarr/widgets/modals";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { useAdvancedFocus } from "../advanced-focus/context";
import { useBoardPermissions } from "../permissions/client";
import { useSectionContext } from "../sections/section-context";
import { useItemActions } from "./item-actions";
import { ItemMoveModal } from "./item-move-modal";
import { matchesWidgetItemQuery } from "./widget-query-scope";

interface WidgetContextMenuProps {
  item: SectionItem;
  widgetRuntimeRef: WidgetRuntimeRef;
  sourceRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export const WidgetContextMenu = ({ item, widgetRuntimeRef, sourceRef, children }: WidgetContextMenuProps) => {
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);
  const { updateAndPersistBoard } = usePersistBoard(board);
  const tItem = useScopedI18n("item");
  const tMenu = useScopedI18n("item.menu.label");
  const t = useI18n();
  const settings = useSettings();
  const isRightClickEnabled = settings.enableRightClickOnWidgets;
  const { openModal } = useModalAction(WidgetEditModal);
  const { openModal: openMoveModal } = useModalAction(ItemMoveModal);
  const { openConfirmModal } = useConfirmModal();
  const { updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations, duplicateItem, removeItem } =
    useItemActions();
  const { data: integrationData, isPending } = clientApi.integration.all.useQuery();
  const currentDefinition = useMemo(
    () => widgetImports[item.kind].definition as WidgetDefinition & { kind: string },
    [item.kind],
  );
  const canOpenAdvancedFocus = supportsAdvancedFocus(currentDefinition);
  const { gridstack } = useSectionContext().refs;
  const queryClient = useQueryClient();
  const { open: openAdvancedFocus } = useAdvancedFocus();
  const integrationsWithInteractAccess = useIntegrationsWithInteractAccess();
  const [menuOpened, setMenuOpened] = useState(false);

  const persistBoard = useCallback(
    (updater: (previous: typeof board) => typeof board) => {
      updateAndPersistBoard(updater, {
        onError: () => {
          showErrorNotification({
            title: t("item.menu.notification.saveError.title"),
            message: t("item.menu.notification.saveError.message"),
          });
        },
      });
    },
    [t, updateAndPersistBoard],
  );

  const options = useMemo(
    () => reduceWidgetOptionsWithDefaultValues(item.kind, settings, item.options),
    [item.kind, settings, item.options],
  );

  const widgetQueryKeys = useMemo(() => getWidgetQueryKeys(currentDefinition), [currentDefinition]);
  const widgetQueryMatcher = "queryMatcher" in currentDefinition ? currentDefinition.queryMatcher : undefined;
  const matchesWidgetQuery = useCallback(
    (queryKey: QueryKey) =>
      matchesWidgetItemQuery(
        queryKey,
        widgetQueryKeys,
        {
          itemId: item.id,
          boardId: board.id,
          integrationIds: item.integrationIds,
          options,
          runtimeQueries: getWidgetRuntimeQueries(widgetRuntimeRef),
        },
        widgetQueryMatcher,
      ),
    [board.id, item.id, item.integrationIds, options, widgetQueryKeys, widgetQueryMatcher, widgetRuntimeRef],
  );
  const isWidgetFetching =
    useIsFetching({
      type: "active",
      predicate: (query) => matchesWidgetQuery(query.queryKey),
    }) > 0;
  const handleRefetch = useCallback(() => {
    void queryClient.refetchQueries({ type: "active", predicate: (query) => matchesWidgetQuery(query.queryKey) });
  }, [matchesWidgetQuery, queryClient]);

  const canInteractWithSelectedIntegrations = useMemo(() => {
    const allowedIds = new Set(integrationsWithInteractAccess.map(({ id }) => id));
    return item.integrationIds.length > 0 && item.integrationIds.every((id) => allowedIds.has(id));
  }, [integrationsWithInteractAccess, item.integrationIds]);

  const setItemOptions = useCallback(
    (partial: Record<string, unknown>) => {
      if (isEditMode) {
        updateItemOptions({ itemId: item.id, newOptions: { ...options, ...partial } });
        return;
      }

      persistBoard((previous) => ({
        ...previous,
        items: previous.items.map((boardItem) =>
          boardItem.id === item.id ? { ...boardItem, options: { ...boardItem.options, ...partial } } : boardItem,
        ),
      }));
    },
    [isEditMode, item.id, options, persistBoard, updateItemOptions],
  );

  type OptionDef = { type: string; skipContextMenu?: boolean };
  const toggleOptions = useMemo(() => {
    if (!hasChangeAccess) return [];
    const rawOptions = currentDefinition.createOptions(settings) as unknown as Record<string, OptionDef>;
    return Object.entries(rawOptions).filter(([, def]) => def.type === "switch" && !def.skipContextMenu);
  }, [currentDefinition, hasChangeAccess, settings]);

  const widgetContextActions =
    currentDefinition.contextActions?.({
      options,
      setOptions: setItemOptions,
      integrationIds: item.integrationIds,
      context: {
        isEditMode,
        boardId: board.id,
        itemId: item.id,
        canInteractWithSelectedIntegrations,
      },
      widgetRuntimeRef,
    }) ?? [];

  const openEditModal = useCallback(() => {
    openModal(
      {
        kind: item.kind,
        value: {
          advancedOptions: item.advancedOptions,
          options: item.options,
          integrationIds: item.integrationIds,
        },
        onSuccessfulEdit: (editResult) => {
          if (isEditMode) {
            updateItemOptions({ itemId: item.id, newOptions: editResult.options });
            updateItemAdvancedOptions({ itemId: item.id, newAdvancedOptions: editResult.advancedOptions });
            updateItemIntegrations({ itemId: item.id, newIntegrations: editResult.integrationIds });
          } else {
            persistBoard((previous) => ({
              ...previous,
              items: previous.items.map((boardItem) =>
                boardItem.id !== item.id
                  ? boardItem
                  : {
                      ...boardItem,
                      options: editResult.options,
                      advancedOptions: editResult.advancedOptions,
                      integrationIds: editResult.integrationIds,
                    },
              ),
            }));
          }
        },
        integrationData: (integrationData ?? []).filter(
          (integration) =>
            "supportedIntegrations" in currentDefinition &&
            (currentDefinition.supportedIntegrations as string[]).some((kind) => kind === integration.kind),
        ),
        integrationSupport: "supportedIntegrations" in currentDefinition,
        settings,
        appId: item.kind === "app" ? (item.options.appId as string | undefined) : undefined,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { title: (fn: any) => `${fn("item.edit.title")} - ${fn(`widget.${item.kind}.name`)}` },
    );
  }, [
    openModal,
    item,
    updateItemOptions,
    updateItemAdvancedOptions,
    updateItemIntegrations,
    integrationData,
    currentDefinition,
    settings,
    isEditMode,
    persistBoard,
  ]);

  const handleToggle = useCallback(
    (key: string) => (checked: boolean) => setItemOptions({ [key]: checked }),
    [setItemOptions],
  );

  if (!session) return <>{children}</>;
  if (!isRightClickEnabled) return <>{children}</>;

  const visibleWidgetActions = widgetContextActions.filter((a) => !a.hidden);

  return (
    <Menu
      shadow="md"
      width={300}
      closeOnItemClick={false}
      position="right-start"
      offset={4}
      opened={menuOpened}
      onChange={setMenuOpened}
    >
      <Menu.ContextMenu>{children}</Menu.ContextMenu>
      <Menu.Dropdown>
        {canOpenAdvancedFocus && (
          <>
            <Menu.Item
              closeMenuOnClick
              leftSection={<IconMaximize size={16} />}
              onClick={() => {
                if (sourceRef.current) openAdvancedFocus(item.id, sourceRef.current);
              }}
              disabled={isEditMode}
            >
              {t("item.advancedFocus.open")}
            </Menu.Item>
            <Menu.Divider />
          </>
        )}
        {toggleOptions.length > 0 && (
          <>
            <Menu.Label>{tMenu("options")}</Menu.Label>
            {toggleOptions.map(([key]) => (
              <Menu.CheckboxItem key={key} checked={Boolean(options[key])} onChange={handleToggle(key)}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {String(translateIfNecessary(t, ((fn: any) => fn(`widget.${item.kind}.option.${key}.label`)) as any))}
              </Menu.CheckboxItem>
            ))}
          </>
        )}

        {visibleWidgetActions.length > 0 && (
          <>
            {toggleOptions.length > 0 && <Menu.Divider />}
            <Menu.Label>{tMenu("actions")}</Menu.Label>
            {visibleWidgetActions.map((action) => {
              const Icon = action.icon;
              return (
                <Menu.Item
                  key={action.key}
                  closeMenuOnClick
                  leftSection={Icon ? <Icon size={16} /> : undefined}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  color={action.color}
                >
                  {translateIfNecessary(t, action.label)}
                </Menu.Item>
              );
            })}
          </>
        )}

        {isEditMode && (
          <>
            {(toggleOptions.length > 0 || visibleWidgetActions.length > 0) && <Menu.Divider />}
            <Menu.Item
              closeMenuOnClick
              leftSection={<IconLayoutKanban size={16} />}
              onClick={() => {
                if (!gridstack.current) return;
                openMoveModal({ item, columnCount: gridstack.current.getColumn(), gridStack: gridstack.current });
              }}
            >
              {tItem("action.moveResize")}
            </Menu.Item>
            <Menu.Item
              closeMenuOnClick
              leftSection={<IconCopy size={16} />}
              onClick={() => duplicateItem({ itemId: item.id })}
            >
              {tItem("action.duplicate")}
            </Menu.Item>
          </>
        )}

        <>
          {(toggleOptions.length > 0 || visibleWidgetActions.length > 0 || isEditMode) && <Menu.Divider />}
          <Menu.Item
            leftSection={isWidgetFetching ? <Loader size={16} /> : <IconRefresh size={16} />}
            onClick={handleRefetch}
            disabled={isWidgetFetching}
          >
            <Group justify="space-between" wrap="nowrap" gap="sm">
              {tMenu("refresh")}
              <WidgetQueryStatus
                queryClient={queryClient}
                matchesQuery={matchesWidgetQuery}
                isFetching={isWidgetFetching}
                t={t}
              />
            </Group>
          </Menu.Item>
          {hasChangeAccess && (
            <Menu.Item
              closeMenuOnClick
              leftSection={<IconSettings size={16} />}
              onClick={openEditModal}
              disabled={isPending}
            >
              {tMenu("settings")}
            </Menu.Item>
          )}
        </>

        {isEditMode && (
          <>
            <Menu.Divider />
            <Menu.Item
              closeMenuOnClick
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => {
                openConfirmModal({
                  title: tItem("remove.title"),
                  children: tItem("remove.message"),
                  onConfirm: () => removeItem({ itemId: item.id }),
                });
              }}
            >
              {tItem("action.remove")}
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

interface WidgetQueryStatusProps {
  queryClient: QueryClient;
  matchesQuery: (queryKey: QueryKey) => boolean;
  isFetching: boolean;
  t: TranslationFunction;
}

const WidgetQueryStatus = ({ queryClient, matchesQuery, isFetching, t }: WidgetQueryStatusProps) => {
  const queries = queryClient.getQueryCache().findAll({
    type: "active",
    predicate: (query) => matchesQuery(query.queryKey),
  });
  const timestamps = queries.map((query) => query.state.dataUpdatedAt).filter(Boolean);
  const latest = timestamps.length > 0 ? Math.max(...timestamps) : 0;
  const ageLabel = useTimeAgo(new Date(latest || Date.now()));
  const ageSuffix = latest > 0 ? ` · ${ageLabel}` : "";

  if (isFetching) {
    return (
      <Group gap={4} wrap="nowrap">
        <Loader size={12} />
        <Text size="xs" c="dimmed">
          {t("item.menu.status.loading")}
        </Text>
      </Group>
    );
  }

  if (queries.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        {t("item.menu.status.idle")}
      </Text>
    );
  }

  const hasError = queries.some((q) => q.state.status === "error");

  if (hasError) {
    return (
      <Tooltip label={t("item.menu.status.error")} position="left">
        <Group gap={4} wrap="nowrap">
          <IconAlertTriangle size={12} color="var(--mantine-color-red-6)" />
          <Text size="xs" c="red.6">
            {t("item.menu.status.error")}
            {ageSuffix}
          </Text>
        </Group>
      </Tooltip>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      <IconCircleCheck size={12} color="var(--mantine-color-green-6)" />
      <Text size="xs" c="dimmed">
        {t("item.menu.status.success")}
        {ageSuffix}
      </Text>
    </Group>
  );
};
