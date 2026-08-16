"use client";

import type { MutableRefObject, ReactNode, RefObject } from "react";
import { useCallback, useMemo, useState } from "react";
import { Group, Loader, Menu, Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconCircleCheck, IconMaximize, IconRefresh, IconSettings } from "@tabler/icons-react";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess, useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { usePersistBoard } from "@homarr/boards/updater";
import { useTimeAgo } from "@homarr/common";
import { useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { translateIfNecessary } from "@homarr/translation";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { WidgetDefinition, WidgetRuntimeRef } from "@homarr/widgets/definition";
import { getWidgetQueryKeys, getWidgetRuntimeQueries, supportsAdvancedFocus } from "@homarr/widgets/definition";
import { reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { useAdvancedFocus } from "../advanced-focus/context";
import { useBoardPermissions } from "../permissions/client";
import { useItemActions } from "./item-actions";
import { LazyWidgetEditModal, preloadWidgetEditModal } from "./lazy-widget-edit-modal";
import { matchesWidgetItemQuery } from "./widget-query-scope";

interface WidgetContextMenuProps {
  item: SectionItem;
  definition: WidgetDefinition;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
  widgetRuntimeRef: WidgetRuntimeRef;
  sourceRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export const WidgetContextMenu = ({
  item,
  definition,
  widgetRuntimeRef,
  sourceRef,
  children,
}: WidgetContextMenuProps) => {
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);
  const { updateAndPersistBoard } = usePersistBoard(board);
  const tMenu = useScopedI18n("item.menu.label");
  const t = useI18n();
  const settings = useSettings();
  const { openModal } = useModalAction(LazyWidgetEditModal);
  const { updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations } = useItemActions();
  const hasSupportedIntegrations = (definition.supportedIntegrations?.length ?? 0) > 0;
  const { data: integrationData = [], isPending } = clientApi.integration.all.useQuery(undefined, {
    enabled: hasSupportedIntegrations,
  });
  const canConfigureWidget =
    hasChangeAccess && (item.kind !== "customApi" || (session?.user.permissions.includes("admin") ?? false));
  const canOpenAdvancedFocus = supportsAdvancedFocus(definition);
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
    () => reduceWidgetOptionsWithDefinition(definition, settings, item.options),
    [definition, settings, item.options],
  );
  const widgetQueryKeys = useMemo(() => getWidgetQueryKeys(definition, item.kind), [definition, item.kind]);
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
        definition.queryMatcher,
      ),
    [board.id, definition.queryMatcher, item.id, item.integrationIds, options, widgetQueryKeys, widgetRuntimeRef],
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
      persistBoard((previous) => ({
        ...previous,
        items: previous.items.map((boardItem) =>
          boardItem.id === item.id ? { ...boardItem, options: { ...boardItem.options, ...partial } } : boardItem,
        ),
      }));
    },
    [item.id, persistBoard],
  );

  type OptionDef = { type: string; skipContextMenu?: boolean };
  const toggleOptions = useMemo(() => {
    if (!canConfigureWidget) return [];
    const rawOptions = definition.createOptions(settings) as unknown as Record<string, OptionDef>;
    return Object.entries(rawOptions).filter(([, option]) => option.type === "switch" && !option.skipContextMenu);
  }, [canConfigureWidget, definition, settings]);

  const widgetContextActions =
    definition.contextActions?.({
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
        },
        onIntegrationSaved: handleRefetch,
        integrationData: integrationData.filter(
          (integration) =>
            definition.supportedIntegrations?.some((kind) => kind === integration.kind) &&
            integration.permissions.hasUseAccess,
        ),
        integrationSupport: definition.supportedIntegrations !== undefined,
        settings,
        appId: item.kind === "app" ? (item.options.appId as string | undefined) : undefined,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { title: (fn: any) => `${fn("item.edit.title")} - ${fn(`widget.${item.kind}.name`)}` },
    );
  }, [
    definition,
    integrationData,
    item,
    handleRefetch,
    openModal,
    persistBoard,
    settings,
    updateItemAdvancedOptions,
    updateItemIntegrations,
    updateItemOptions,
  ]);

  const handleToggle = useCallback(
    (key: string) => (checked: boolean) => setItemOptions({ [key]: checked }),
    [setItemOptions],
  );

  if (!session || !settings.enableRightClickOnWidgets || isEditMode || item.kind === "app") return <>{children}</>;

  const visibleWidgetActions = widgetContextActions.filter((action) => !action.hidden);

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
                if (sourceRef.current)
                  openAdvancedFocus(item.id, sourceRef.current, {
                    restoreFocusTarget:
                      sourceRef.current.querySelector<HTMLElement>("[data-advanced-focus-trigger]") ??
                      sourceRef.current,
                  });
              }}
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

        {(toggleOptions.length > 0 || visibleWidgetActions.length > 0) && <Menu.Divider />}
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
        <Menu.Item
          closeMenuOnClick
          leftSection={<IconSettings size={16} />}
          onClick={openEditModal}
          onFocus={preloadWidgetEditModal}
          onPointerEnter={preloadWidgetEditModal}
          disabled={!canConfigureWidget || (hasSupportedIntegrations && isPending)}
        >
          {tMenu("settings")}
        </Menu.Item>
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

  const hasError = queries.some((query) => query.state.status === "error");
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
