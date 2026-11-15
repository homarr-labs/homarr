"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Loader, Popover, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconBell, IconPencil } from "@tabler/icons-react";
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
import { getHeaderItemKey } from "@homarr/validation/user";
import { loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";
import { WidgetError } from "@homarr/widgets/errors";
import { WidgetCardShell } from "@homarr/widgets/widget-card-shell";

import { HeaderButton } from "./button";
import { useHeaderWidgetEditor } from "./header-widget-editor";
import { HeaderWidgetRuntimeBoundary } from "./header-widget-runtime-boundary";

export const HeaderWidget = ({ item, userId }: { item: HeaderWidgetItem; userId: string | null }) => {
  const [opened, setOpened] = useState(false);
  const [currentItem, setCurrentItem] = useState(item);
  const settings = useSettings();
  const preferencesRef = useRef(settings.headerPreferences);
  const editMode = useOptionalEditMode();
  const router = useRouter();
  const t = useI18n();
  const editor = useHeaderWidgetEditor();
  const mutation = clientApi.user.changeHeaderPreferences.useMutation({
    scope: { id: `header-preferences:${userId}` },
  });
  useEffect(() => setCurrentItem(item), [item]);
  useEffect(() => {
    preferencesRef.current = settings.headerPreferences;
  }, [settings.headerPreferences]);

  if (!userId) return null;

  const saveItem = async (next: HeaderWidgetItem) => {
    const previousPreferences = preferencesRef.current;
    const previousItem = currentItem;
    const zones = { ...preferencesRef.current.zones };
    for (const zone of ["left", "center", "right"] as const) {
      zones[zone] = zones[zone].map((candidate) => {
        if (getHeaderItemKey(candidate) === getHeaderItemKey(next)) return next;
        return candidate;
      });
    }
    const nextPreferences = { ...preferencesRef.current, zones };
    preferencesRef.current = nextPreferences;
    setCurrentItem(next);
    try {
      await mutation.mutateAsync({ id: userId, headerPreferences: nextPreferences });
      if (preferencesRef.current === nextPreferences) router.refresh();
    } catch (error) {
      if (preferencesRef.current === nextPreferences) {
        preferencesRef.current = previousPreferences;
        setCurrentItem(previousItem);
      }
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
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      shadow="md"
      withinPortal
      trapFocus
      returnFocus
      zIndex="calc(var(--homarr-z-index-board-header) + 1)"
    >
      <Popover.Target>
        <Tooltip label={title}>
          <HeaderButton
            aria-label={title}
            loading={editor.loading || mutation.isPending}
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
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="xs" w="min(440px, calc(100vw - 24px))">
        <Group justify="space-between" wrap="nowrap" mb="xs">
          <Text fw={600} size="sm" truncate>
            {title}
          </Text>
          <Button size="compact-xs" variant="subtle" leftSection={<IconPencil size={14} />} onClick={configure}>
            {t("common.action.edit")}
          </Button>
        </Group>
        {opened && (
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
        )}
      </Popover.Dropdown>
    </Popover>
  );
};

const HeaderWidgetContent = ({
  item,
  userId,
  onChange,
}: {
  item: HeaderWidgetItem;
  userId: string;
  onChange: (next: HeaderWidgetItem) => void;
}) => {
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
  let localStateItemId: string | undefined;
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
      h="min(420px, calc(100dvh - 150px))"
      mih={100}
    >
      <HeaderWidgetRuntimeBoundary>
        <IntegrationProvider integrations={allowedIntegrations}>
          <Component
            options={options as never}
            integrationIds={allowedIntegrations.map((integration) => integration.id)}
            itemId={localStateItemId}
            boardId={localStateBoardId}
            width={width || 400}
            height={height || 420}
            isEditMode={false}
            displayMode="compact"
            setOptions={({ newOptions }) => onChange({ ...item, options: { ...options, ...newOptions } })}
          />
        </IntegrationProvider>
      </HeaderWidgetRuntimeBoundary>
    </WidgetCardShell>
  );
};
