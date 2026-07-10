"use client";

import type { MutableRefObject, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Group, Loader, Menu, Switch, Text } from "@mantine/core";
import { IconCopy, IconLayoutKanban, IconRefresh, IconSettings, IconTrash } from "@tabler/icons-react";
import type { QueryClient } from "@tanstack/react-query";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { WidgetContextMenuAction } from "@homarr/widgets";
import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";
import { WidgetEditModal } from "@homarr/widgets/modals";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { useSectionContext } from "../sections/section-context";
import { useItemActions } from "./item-actions";
import { ItemMoveModal } from "./item-move-modal";

interface WidgetContextMenuProps {
  item: SectionItem;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
  children: ReactNode;
}

export const WidgetContextMenu = ({ item, widgetStateRef, children }: WidgetContextMenuProps) => {
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const tItem = useScopedI18n("item");
  const tMenu = useScopedI18n("item.menu.label");
  const t = useI18n();
  const settings = useSettings();
  const { openModal } = useModalAction(WidgetEditModal);
  const { openModal: openMoveModal } = useModalAction(ItemMoveModal);
  const { openConfirmModal } = useConfirmModal();
  const { updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations, duplicateItem, removeItem } =
    useItemActions();
  const { data: integrationData, isPending } = clientApi.integration.all.useQuery();
  const { mutate: saveBoard } = clientApi.board.saveBoard.useMutation();
  const currentDefinition = useMemo(() => widgetImports[item.kind].definition, [item.kind]);
  const { gridstack } = useSectionContext().refs;
  const queryClient = useQueryClient();

  const widgetQueryKey = useMemo(() => [["widget", item.kind]], [item.kind]);
  const isWidgetFetching = useIsFetching({ queryKey: widgetQueryKey }) > 0;
  const handleRefetch = useCallback(() => {
    void queryClient.refetchQueries({ queryKey: widgetQueryKey, type: "all" });
  }, [queryClient, widgetQueryKey]);

  const options = useMemo(
    () => reduceWidgetOptionsWithDefaultValues(item.kind, settings, item.options) as Record<string, unknown>,
    [item.kind, settings, item.options],
  );

  type OptionDef = { type: string; skipContextMenu?: boolean };
  const toggleOptions = useMemo(() => {
    const rawOptions = currentDefinition.createOptions(settings) as unknown as Record<string, OptionDef>;
    return Object.entries(rawOptions).filter(([, def]) => def.type === "switch" && !def.skipContextMenu);
  }, [currentDefinition, settings]);

  const widgetContextActions = useMemo(() => {
    const def = currentDefinition as Record<string, unknown>;
    if (typeof def.contextActions !== "function") return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions = (def.contextActions as any)({
      options,
      setOptions: (partial: Record<string, unknown>) => {
        updateItemOptions({ itemId: item.id, newOptions: { ...options, ...partial } });
      },
      integrationIds: item.integrationIds,
      context: { isEditMode, boardId: board.id, itemId: item.id },
      widgetStateRef,
    });
    return (Array.isArray(actions) ? actions : []) as WidgetContextMenuAction[];
  }, [currentDefinition, options, item, updateItemOptions, isEditMode, board.id, widgetStateRef]);

  const persistBoard = useCallback(
    (updatedItems: typeof board.items) => {
      saveBoard({ ...board, items: updatedItems });
    },
    [board, saveBoard],
  );

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
          updateItemOptions({ itemId: item.id, newOptions: editResult.options });
          updateItemAdvancedOptions({ itemId: item.id, newAdvancedOptions: editResult.advancedOptions });
          updateItemIntegrations({ itemId: item.id, newIntegrations: editResult.integrationIds });
          if (!isEditMode) {
            persistBoard(
              board.items.map((boardItem) =>
                boardItem.id !== item.id
                  ? boardItem
                  : {
                      ...boardItem,
                      options: editResult.options,
                      advancedOptions: editResult.advancedOptions,
                      integrationIds: editResult.integrationIds,
                    },
              ),
            );
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
    board,
  ]);

  const handleToggle = useCallback(
    (key: string) => (checked: boolean) => {
      const newOptions = { ...options, [key]: checked };
      updateItemOptions({ itemId: item.id, newOptions });
      persistBoard(
        board.items.map((boardItem) => (boardItem.id !== item.id ? boardItem : { ...boardItem, options: newOptions })),
      );
    },
    [options, item.id, updateItemOptions, persistBoard, board],
  );

  if (!session) return <>{children}</>;

  const visibleWidgetActions = widgetContextActions.filter((a) => !a.hidden);

  return (
    <Menu shadow="md" width={300} closeOnItemClick={false} position="right-start" offset={4}>
      <Menu.ContextMenu>{children}</Menu.ContextMenu>
      <Menu.Dropdown>
        {toggleOptions.length > 0 && (
          <>
            <Menu.Label>{tMenu("options")}</Menu.Label>
            {toggleOptions.map(([key]) => (
              <Menu.Item key={key} onClick={() => handleToggle(key)(!options[key])}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Group wrap="nowrap">
                  {String(translateIfNecessary(t, ((fn: any) => fn(`widget.${item.kind}.option.${key}.label`)) as any))}
                  <Switch size="xs" checked={Boolean(options[key])} readOnly tabIndex={-1} ml="auto" />
                </Group>
              </Menu.Item>
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
                  {String(translateIfNecessary(t, action.label))}
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
            <Group justify="space-between" wrap="nowrap">
              {tMenu("refresh")}
              <Text size="xs" c="dimmed">
                <WidgetCacheAge queryClient={queryClient} queryKey={widgetQueryKey} isFetching={isWidgetFetching} />
              </Text>
            </Group>
          </Menu.Item>
          <Menu.Item
            closeMenuOnClick
            leftSection={<IconSettings size={16} />}
            onClick={openEditModal}
            disabled={isPending}
          >
            {tMenu("settings")}
          </Menu.Item>
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

const WidgetCacheAge = ({
  queryClient,
  queryKey,
  isFetching,
}: {
  queryClient: QueryClient;
  queryKey: unknown[];
  isFetching: boolean;
}) => {
  // 1s tick for "just now" → "1s ago" label transition; isFetching prop handles refetch reactivity
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (isFetching) return <Loader size={12} />;

  const timestamps = queryClient
    .getQueryCache()
    .findAll({ queryKey })
    .map((q) => q.state.dataUpdatedAt)
    .filter(Boolean);
  if (timestamps.length === 0) return null;

  const oldest = Math.min(...timestamps);
  const seconds = Math.floor((Date.now() - oldest) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
};
