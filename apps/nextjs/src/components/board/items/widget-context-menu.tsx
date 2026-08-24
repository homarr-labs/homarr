"use client";

import type { MutableRefObject, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Group, Loader, Menu, Switch, Text, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCopy,
  IconLayoutKanban,
  IconRefresh,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { partialMatchKey, useIsFetching, useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useTimeAgo } from "@homarr/common";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { TranslationFunction } from "@homarr/translation";
import type { WidgetContextMenuAction, WidgetDefinition } from "@homarr/widgets/definition";
import { getWidgetQueryKeys } from "@homarr/widgets/definition";
import { reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { useSectionContext } from "../sections/section-context";
import { useItemActions } from "./item-actions";
import { LazyItemMoveModal, preloadItemMoveModal } from "./lazy-item-move-modal";
import { LazyWidgetEditModal, preloadWidgetEditModal } from "./lazy-widget-edit-modal";

interface WidgetContextMenuProps {
  item: SectionItem;
  definition: WidgetDefinition;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
  children: ReactNode;
}

export const WidgetContextMenu = ({ item, definition, widgetStateRef, children }: WidgetContextMenuProps) => {
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  const settings = useSettings();

  if (!session || !settings.enableRightClickOnWidgets) return <>{children}</>;
  const isLinkWidget = item.kind === "app" || item.kind === "bookmarks";
  // Keep the Homarr menu in edit mode so these widgets can still be edited or removed.
  if (isLinkWidget && !isEditMode) return <>{children}</>;

  return (
    <WidgetContextMenuInner item={item} definition={definition} widgetStateRef={widgetStateRef} settings={settings}>
      {children}
    </WidgetContextMenuInner>
  );
};

const WidgetContextMenuInner = ({
  item,
  definition,
  widgetStateRef,
  children,
  settings,
}: WidgetContextMenuProps & { settings: ReturnType<typeof useSettings> }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Menu
      shadow="md"
      width={300}
      closeOnItemClick={false}
      position="right-start"
      offset={4}
      opened={isMenuOpen}
      onChange={setIsMenuOpen}
    >
      <Menu.ContextMenu>{children}</Menu.ContextMenu>
      <Menu.Dropdown>
        {isMenuOpen && (
          <WidgetContextMenuDropdown
            item={item}
            definition={definition}
            widgetStateRef={widgetStateRef}
            settings={settings}
          />
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

type WidgetContextMenuDropdownProps = Omit<WidgetContextMenuProps, "children"> & {
  settings: ReturnType<typeof useSettings>;
};

const WidgetContextMenuDropdown = ({ item, definition, widgetStateRef, settings }: WidgetContextMenuDropdownProps) => {
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const tItem = useScopedI18n("item");
  const tMenu = useScopedI18n("item.menu.label");
  const t = useI18n();
  const hasSupportedIntegrations =
    "supportedIntegrations" in definition && (definition.supportedIntegrations?.length ?? 0) > 0;
  const { openModal } = useModalAction(LazyWidgetEditModal);
  const { openModal: openMoveModal } = useModalAction(LazyItemMoveModal);
  const { openConfirmModal } = useConfirmModal();
  const { updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations, duplicateItem, removeItem } =
    useItemActions();
  const { data: integrationData, isPending } = clientApi.integration.all.useQuery(undefined, {
    enabled: hasSupportedIntegrations,
  });
  const { mutate: saveBoard } = clientApi.board.saveBoard.useMutation();
  const { gridstack } = useSectionContext().refs;
  const queryClient = useQueryClient();

  const widgetQueryKeys = useMemo(() => getWidgetQueryKeys(definition, item.kind), [definition, item.kind]);
  const isWidgetFetching =
    useIsFetching({
      predicate: (query) => widgetQueryKeys.some((queryKey) => partialMatchKey(query.queryKey, queryKey)),
    }) > 0;
  const handleRefetch = useCallback(() => {
    void Promise.all(widgetQueryKeys.map((queryKey) => queryClient.refetchQueries({ queryKey, type: "all" })));
  }, [queryClient, widgetQueryKeys]);

  const options = useMemo(
    () => reduceWidgetOptionsWithDefinition(definition, settings, item.options),
    [definition, settings, item.options],
  );

  type OptionDef = { type: string; skipContextMenu?: boolean };
  const toggleOptions = useMemo(() => {
    const rawOptions = definition.createOptions(settings) as unknown as Record<string, OptionDef>;
    return Object.entries(rawOptions).filter(([, def]) => def.type === "switch" && !def.skipContextMenu);
  }, [definition, settings]);

  const widgetContextActions = useMemo(() => {
    const def = definition as unknown as Record<string, unknown>;
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
  }, [definition, options, item, updateItemOptions, isEditMode, board.id, widgetStateRef]);

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
        definition,
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
            "supportedIntegrations" in definition &&
            (definition.supportedIntegrations as string[]).some((kind) => kind === integration.kind),
        ),
        integrationSupport: "supportedIntegrations" in definition,
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
    definition,
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

  const visibleWidgetActions = widgetContextActions.filter((a) => !a.hidden);

  return (
    <>
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
            onFocus={preloadItemMoveModal}
            onPointerEnter={preloadItemMoveModal}
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
              queryKeys={widgetQueryKeys}
              isFetching={isWidgetFetching}
              t={t}
            />
          </Group>
        </Menu.Item>
        <Menu.Item
          closeMenuOnClick
          leftSection={<IconSettings size={16} />}
          onClick={openEditModal}
          onFocus={preloadWidgetEditModal}
          onPointerEnter={preloadWidgetEditModal}
          disabled={hasSupportedIntegrations && isPending}
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
    </>
  );
};

interface WidgetQueryStatusProps {
  queryClient: QueryClient;
  queryKeys: QueryKey[];
  isFetching: boolean;
  t: TranslationFunction;
}

const WidgetQueryStatus = ({ queryClient, queryKeys, isFetching, t }: WidgetQueryStatusProps) => {
  const queries = [...new Set(queryKeys.flatMap((queryKey) => queryClient.getQueryCache().findAll({ queryKey })))];
  const timestamps = queries.map((query) => query.state.dataUpdatedAt).filter(Boolean);
  const latest = timestamps.length > 0 ? Math.max(...timestamps) : 0;
  const ageLabel = useTimeAgo(new Date(latest));

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
    const errorQuery = queries.find((q) => q.state.status === "error");
    const errorMessage =
      errorQuery?.state.error instanceof Error
        ? errorQuery.state.error.message
        : String(errorQuery?.state.error ?? "Unknown error");

    return (
      <Tooltip label={errorMessage} multiline position="left" w={250}>
        <Group gap={4} wrap="nowrap">
          <IconAlertTriangle size={12} color="var(--mantine-color-red-6)" />
          <Text size="xs" c="red.6">
            {t("item.menu.status.error")}
            {latest > 0 && ` · ${ageLabel}`}
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
        {latest > 0 && ` · ${ageLabel}`}
      </Text>
    </Group>
  );
};
