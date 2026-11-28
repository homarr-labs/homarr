"use client";

import { Suspense, use, useEffect, useState } from "react";
import { Loader, MantineThemeProvider, Popover, Portal, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconBell } from "@tabler/icons-react";
import { ErrorBoundary } from "react-error-boundary";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { IntegrationProvider } from "@homarr/auth/client";
import { useOptionalEditMode } from "@homarr/boards/edit-mode";
import { getWidgetName } from "@homarr/definitions";
import { showErrorNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";
import type { HeaderWidgetItem } from "@homarr/validation/user";
import { getHeaderItems } from "@homarr/validation/user";
import { loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";
import { WidgetError } from "@homarr/widgets/errors";
import { WidgetCardShell } from "@homarr/widgets/widget-card-shell";

import { HeaderButton } from "./button";
import { getLogicalGridSize } from "~/components/board/layout";
import { useHeaderWidgetEditor } from "./header-widget-editor";
import { useHeaderWidgetPreferences } from "./header-widget-preferences";
import { HeaderWidgetRuntimeBoundary } from "./header-widget-runtime-boundary";
import { isBoardOnlyHeaderWidget } from "./header-widget-support";

export const HeaderWidget = ({
  item,
  userId,
  isActive,
}: {
  item: HeaderWidgetItem;
  userId: string | null;
  isActive: boolean;
}) => {
  const [opened, setOpened] = useState(false);
  const [dropdown, setDropdown] = useState<HTMLDivElement | null>(null);
  const { preferences, save, savingItemIds } = useHeaderWidgetPreferences();
  let currentItem = item;
  const savedItem = getHeaderItems(preferences.zones).find(
    (candidate) => candidate.type === "widget" && candidate.id === item.id,
  );
  if (savedItem?.type === "widget") currentItem = savedItem;
  const editMode = useOptionalEditMode();
  const t = useI18n();
  const editor = useHeaderWidgetEditor();
  const keepsRunning = isActive && (currentItem.kind === "timer" || currentItem.kind === "countdown");

  useEffect(() => {
    if (!isActive) setOpened(false);
  }, [isActive]);

  if (!userId) return null;

  const saveItem = async (next: HeaderWidgetItem) => {
    try {
      await save(next);
    } catch (error) {
      showErrorNotification({ title: t("common.error"), message: String(error) });
    }
  };

  const configure = () => {
    setOpened(false);
    void editor.open(currentItem, (next) => void saveItem(next));
  };
  const title = currentItem.advancedOptions.title ?? getWidgetName(currentItem.kind, t);
  let Icon = widgetCatalogIcons[currentItem.kind];
  if (currentItem.id === "notifications") Icon = IconBell;

  return (
    <Popover
      opened={opened && isActive}
      onChange={setOpened}
      keepMounted={keepsRunning}
      keepMountedMode="display-none"
      position="bottom-end"
      shadow="md"
      withinPortal
      trapFocus
      returnFocus
      zIndex="calc(var(--homarr-z-index-board-header) + 1)"
    >
      <Tooltip label={title}>
        <Popover.Target>
          <HeaderButton
            aria-label={title}
            loading={editor.loading || savingItemIds.includes(item.id)}
            onClick={() => {
              if (editMode?.[0]) {
                configure();
                return;
              }
              setOpened((previous) => !previous);
            }}
          >
            <Icon size={20} stroke={1.5} />
          </HeaderButton>
        </Popover.Target>
      </Tooltip>
      <Popover.Dropdown
        ref={setDropdown}
        p="xs"
        w={`min(${getLogicalGridSize(currentItem.size.width) + 16}px, calc(100vw - 24px))`}
      >
        <Text fw={600} size="sm" truncate mb="xs">
          {title}
        </Text>
        {isActive && (opened || keepsRunning) && dropdown && (
          <MantineThemeProvider
            inherit
            theme={{ components: { Portal: Portal.extend({ defaultProps: { target: dropdown } }) } }}
          >
            <QueryErrorResetBoundary>
              {({ reset }) => (
                <ErrorBoundary
                  FallbackComponent={WidgetError}
                  onReset={reset}
                  resetKeys={[currentItem.kind, currentItem.options, currentItem.integrationIds]}
                >
                  <Suspense fallback={<Loader size="sm" />}>
                    <HeaderWidgetContent item={currentItem} userId={userId} onChange={(next) => void saveItem(next)} />
                  </Suspense>
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </MantineThemeProvider>
        )}
      </Popover.Dropdown>
    </Popover>
  );
};

interface HeaderWidgetContentProps {
  item: HeaderWidgetItem;
  userId: string;
  onChange: (next: HeaderWidgetItem) => void;
}

const HeaderWidgetContent = (props: HeaderWidgetContentProps) => {
  const t = useI18n("management.page.user.setting.general.header.configuration");
  if (isBoardOnlyHeaderWidget(props.item.kind)) {
    return (
      <Text p="md" c="dimmed" size="sm">
        {t("boardOnly")}
      </Text>
    );
  }
  return <SupportedHeaderWidgetContent {...props} />;
};

const SupportedHeaderWidgetContent = ({ item, userId, onChange }: HeaderWidgetContentProps) => {
  const { Component, definition } = use(loadWidgetResources(item.kind));
  const settings = useSettings();
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const t = useI18n();
  const [integrations] = clientApi.integration.all.useSuspenseQuery();
  const allowedIntegrations = integrations.filter(
    (integration) => item.integrationIds.includes(integration.id) && integration.permissions.hasUseAccess,
  );
  const options = reduceWidgetOptionsWithDefinition(definition, settings, item.options);
  const needsSetup =
    definition.supportedIntegrations !== undefined &&
    definition.integrationsRequired !== false &&
    allowedIntegrations.length === 0;
  let localStateBoardId: string | undefined;
  let localStateItemId = `header:${userId}:${item.id}`;
  if (item.kind === "timer" || item.kind === "countdown") {
    localStateBoardId = `header:${userId}`;
    localStateItemId = item.id;
  }

  if (needsSetup)
    return (
      <Text p="md" c="dimmed" size="sm">
        {t("item.create.connectionStatus.needsSetup")}
      </Text>
    );

  return (
    <WidgetCardShell
      innerRef={ref}
      kind={item.kind}
      advancedOptions={item.advancedOptions}
      opacity={1}
      p={0}
      radius="md"
      h={`min(${getLogicalGridSize(item.size.height)}px, calc(100dvh - 150px))`}
      mih={100}
    >
      <HeaderWidgetRuntimeBoundary>
        <IntegrationProvider integrations={allowedIntegrations}>
          <Component
            options={options as never}
            integrationIds={allowedIntegrations.map((integration) => integration.id)}
            itemId={localStateItemId}
            boardId={localStateBoardId}
            width={width || getLogicalGridSize(item.size.width)}
            height={height || getLogicalGridSize(item.size.height)}
            isEditMode={false}
            displayMode="compact"
            setOptions={({ newOptions }) => onChange({ ...item, options: { ...options, ...newOptions } })}
          />
        </IntegrationProvider>
      </HeaderWidgetRuntimeBoundary>
    </WidgetCardShell>
  );
};
