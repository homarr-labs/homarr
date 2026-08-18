import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Group,
  Image,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconApi, IconBuildingStore } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import {
  getIconUrl,
  getBoardLaneColumnCount,
  getIntegrationName,
  getRootSectionLane,
  widgetIntegrationSupport,
  widgetKinds,
  widgetKindsWithOptionalIntegrations,
} from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { CatalogItem, SelectGridLayout, selectGridCardHeight } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";
import { widgetCatalogIcons } from "@homarr/widgets/catalog";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import { useSetupAnalytics } from "~/components/create/setup-analytics";
import type { EmptySection } from "~/app/[locale]/boards/_types";
import { useItemActions } from "./item-actions";
import type { WidgetConnectionStatus } from "./item-select-data";
import {
  getWidgetConnectionStatus,
  resolveMatchingIntegrationsAsync,
  tryLockSelection,
  unlockSelection,
} from "./item-select-data";
import { LazyWidgetEditModal, preloadWidgetEditModal } from "./lazy-widget-edit-modal";

interface ItemSelectModalContentProps {
  actions: { closeModal: () => void };
  integrationData: RouterOutputs["integration"]["all"] | undefined;
  customWidgetDefs: RouterOutputs["customWidget"]["available"] | undefined;
  ensureIntegrationDataAsync: () => Promise<RouterOutputs["integration"]["all"]>;
  isAdmin: boolean;
  canCreateIntegration: boolean;
  initialSearch?: string;
}

const ItemSelectModalContent = ({
  actions,
  integrationData,
  customWidgetDefs,
  ensureIntegrationDataAsync,
  isAdmin,
  canCreateIntegration,
  initialSearch = "",
}: ItemSelectModalContentProps) => {
  const [search, setSearch] = useState(initialSearch);
  const t = useI18n();
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const currentLayout = board.layouts.find((layout) => layout.id === currentLayoutId);
  const mainCanvasSection = board.sections
    .filter(
      (section): section is EmptySection => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main",
    )
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
    .at(0);
  const placementOptions = useMemo(
    () => [
      ...(mainCanvasSection ? [{ value: mainCanvasSection.id, label: t("item.create.destination.mainCanvas") }] : []),
      ...board.sections.flatMap((section) => {
        if (section.kind !== "empty") return [];
        const lane = getRootSectionLane(section.xOffset);
        if (lane === "main" || !currentLayout || getBoardLaneColumnCount(currentLayout, lane) === 0) return [];
        return [
          {
            value: section.id,
            label: t(`item.create.destination.${lane === "left" ? "leftRail" : "rightRail"}`),
          },
        ];
      }),
      ...board.sections
        .filter((section) => section.kind === "container")
        .map((section) => ({
          value: section.id,
          label: section.options.title.trim() || t("section.container.untitled"),
        })),
    ],
    [board.sections, currentLayout, mainCanvasSection, t],
  );
  const [targetSectionId, setTargetSectionId] = useState<string | null>(placementOptions[0]?.value ?? null);
  const [loadingSelection, setLoadingSelection] = useState<string | null>(null);
  const selectionLock = useRef(false);
  const { createItem, removeItem } = useItemActions();

  useEffect(() => {
    if (placementOptions.some(({ value }) => value === targetSectionId)) return;
    setTargetSectionId(placementOptions[0]?.value ?? null);
  }, [placementOptions, targetSectionId]);

  const { openModal: openEditModal } = useModalAction(LazyWidgetEditModal);
  const { openModal: openIntegrationModal } = useModalAction(IntegrationSelectModal);
  const settings = useSettings();
  const trackSetup = useSetupAnalytics();
  const flowStartedAt = useRef<number | null>(null);

  const availableKinds = useMemo(
    () => new Set((integrationData ?? []).filter(({ permissions }) => permissions.hasUseAccess).map((i) => i.kind)),
    [integrationData],
  );

  const items = useMemo(
    () =>
      widgetKinds
        .filter((kind) => kind !== "customApi")
        .map((kind) => {
          return {
            kind,
            supportedIntegrations: (widgetIntegrationSupport[kind] ?? []).filter(
              (integration) => integration !== "mock",
            ),
            icon: widgetCatalogIcons[kind],
            name: t(`widget.${kind}.name`),
            description: t(`widget.${kind}.description`),
          };
        })
        .sort((itemA, itemB) => {
          if (itemA.kind === "app") return -1;
          if (itemB.kind === "app") return 1;

          return itemA.name.localeCompare(itemB.name);
        }),
    [t],
  );

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.supportedIntegrations.some((kind) => getIntegrationName(kind).toLowerCase().includes(query)),
    );
  }, [items, search]);

  const filteredCustomWidgets = useMemo(
    () => (customWidgetDefs ?? []).filter((def) => def.name.toLowerCase().includes(search.toLowerCase())),
    [customWidgetDefs, search],
  );

  const notifyDefinitionLoadError = (error: unknown) => {
    showErrorNotification({
      title: t("common.error"),
      message: error instanceof Error ? error.message : String(error),
    });
  };

  const notifyCreated = (updatedBoard: ReturnType<typeof createItem>, itemId: string, name: string) => {
    const createdItem = updatedBoard?.items.find((item) => item.id === itemId);
    if (!createdItem) {
      showErrorNotification({
        title: t("item.create.notification.error.title"),
        message: t("item.create.notification.error.message"),
      });
      return false;
    }

    const actualSectionId =
      createdItem.layouts.find(({ layoutId }) => layoutId === currentLayoutId)?.sectionId ??
      createdItem.layouts[0]?.sectionId;
    const actualDestination = placementOptions.find(({ value }) => value === actualSectionId)?.label;
    const wasRelocated = targetSectionId !== null && actualSectionId !== targetSectionId && actualDestination;
    const notificationId = `board-item-created:${itemId}`;
    showSuccessNotification({
      id: notificationId,
      title: t("item.create.notification.success.title"),
      message: (
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm">
            {wasRelocated
              ? t("item.create.notification.success.relocatedMessage", { name, destination: actualDestination })
              : t("item.create.notification.success.message", { name })}
          </Text>
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => {
              removeItem({ itemId });
              notifications.hide(notificationId);
            }}
          >
            {t("common.action.undo")}
          </Button>
        </Group>
      ),
      autoClose: 10_000,
    });
    return true;
  };

  const handleAddCustomWidget = async (customWidgetDefinition: NonNullable<typeof customWidgetDefs>[number]) => {
    if (!tryLockSelection(selectionLock)) return;
    setLoadingSelection(`custom:${customWidgetDefinition.id}`);
    preloadWidgetEditModal();
    try {
      const definition = await loadWidgetDefinition("customApi");
      const itemId = createId();
      const defaultOptions = reduceWidgetOptionsWithDefinition(definition, settings);
      const options = {
        ...defaultOptions,
        definitionId: customWidgetDefinition.id,
        configuration: customWidgetDefinition.defaultOptions,
        configurationVersion: customWidgetDefinition.updatedAt.getTime(),
      };
      actions.closeModal();
      openEditModal(
        {
          kind: "customApi",
          definition,
          value: {
            advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
            options,
            integrationIds: [],
          },
          onSuccessfulEdit: ({ options: configuredOptions, advancedOptions }) => {
            const updatedBoard = createItem({
              id: itemId,
              kind: "customApi",
              integrationIds: [],
              options: configuredOptions,
              targetSectionId: targetSectionId ?? undefined,
              advancedOptions,
            });
            notifyCreated(updatedBoard, itemId, customWidgetDefinition.name);
          },
          integrationData: [],
          integrationSupport: false,
          settings,
        },
        {
          title: (titleT) => `${titleT("item.edit.title")} - ${customWidgetDefinition.name}`,
        },
      );
    } catch (error) {
      notifyDefinitionLoadError(error);
    } finally {
      unlockSelection(selectionLock);
      setLoadingSelection(null);
    }
  };

  const handleAdd = async (kind: WidgetKind) => {
    if (!tryLockSelection(selectionLock)) return;
    flowStartedAt.current = performance.now();
    trackSetup("widget-started", { entryPoint: "board", intent: kind });
    setLoadingSelection(kind);
    preloadWidgetEditModal();
    try {
      const definition = await loadWidgetDefinition(kind);
      const hasIntegrationSupport = "supportedIntegrations" in definition;

      const matchingIntegrations = await resolveMatchingIntegrationsAsync({
        hasIntegrationSupport,
        supportedIntegrations: definition.supportedIntegrations ?? [],
        currentData: integrationData,
        ensureDataAsync: ensureIntegrationDataAsync,
      });

      const maxIntegrations = "maxIntegrations" in definition ? (definition.maxIntegrations ?? Infinity) : Infinity;
      const matchingIntegrationCount = Math.min(matchingIntegrations.length, maxIntegrations);
      const itemId = createId();
      const defaultOptions = reduceWidgetOptionsWithDefinition(definition, settings);
      const openEditor = (
        availableIntegrations: { id: string; name: string; url: string; kind: IntegrationKind }[],
      ) => {
        const selectedIntegrationIds = availableIntegrations
          .slice(0, maxIntegrations)
          .map((integration) => integration.id);
        openEditModal(
          {
            kind,
            definition,
            value: {
              advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
              options: defaultOptions,
              integrationIds: selectedIntegrationIds,
            },
            onSuccessfulEdit: ({ options, integrationIds: newIntegrationIds, advancedOptions }) => {
              const updatedBoard = createItem({
                id: itemId,
                kind,
                options,
                integrationIds: newIntegrationIds,
                targetSectionId: targetSectionId ?? undefined,
                advancedOptions,
              });
              if (!notifyCreated(updatedBoard, itemId, t(`widget.${kind}.name`))) return;
              trackSetup("widget-completed", {
                entryPoint: "board",
                intent: kind,
                outcome: "completed",
                elapsedMs: flowStartedAt.current ? Math.round(performance.now() - flowStartedAt.current) : undefined,
              });
            },
            integrationData: availableIntegrations,
            integrationSupport: hasIntegrationSupport,
            settings,
          },
          {
            title: (titleT) => `${titleT("item.edit.title")} - ${titleT(`widget.${kind}.name`)}`,
          },
        );
      };
      const integrationsRequired =
        hasIntegrationSupport && (!("integrationsRequired" in definition) || definition.integrationsRequired !== false);

      if (integrationsRequired && matchingIntegrationCount === 0) {
        trackSetup("dependency-blocked", {
          entryPoint: "board",
          intent: kind,
          outcome: "blocked",
          canResolveInline: canCreateIntegration,
        });
        if (!canCreateIntegration) {
          showErrorNotification({
            title: t("item.create.missingIntegration.title"),
            message: t("item.create.missingIntegration.noPermission"),
          });
          return;
        }

        actions.closeModal();
        openIntegrationModal({
          allowedKinds: (definition.supportedIntegrations ?? []).filter((integration) => integration !== "mock"),
          onSuccess: (result) => {
            if (result) {
              trackSetup("dependency-resolved-inline", {
                entryPoint: "board",
                intent: kind,
                outcome: "continued",
                canResolveInline: true,
              });
              openEditor([result.integration]);
            }
          },
        });
        return;
      }

      actions.closeModal();
      openEditor(matchingIntegrations);
    } catch (error) {
      notifyDefinitionLoadError(error);
    } finally {
      unlockSelection(selectionLock);
      setLoadingSelection(null);
    }
  };

  return (
    <Flex gap="md" align="stretch">
      <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
        <SelectGridLayout
          search={search}
          onSearchChange={setSearch}
          placeholder={`${t("item.create.search")}...`}
          ariaLabel={t("item.create.search")}
          onSearchKeyDown={(event) => {
            if (event.key === "Enter" && loadingSelection === null && filteredItems.length === 1) {
              const [item] = filteredItems;
              if (item) void handleAdd(item.kind);
            }
          }}
        >
          {placementOptions.length > 1 && (
            <Box style={{ gridColumn: "1 / -1" }}>
              <Select
                label={t("item.create.destination.label")}
                description={t("item.create.destination.description")}
                data={placementOptions}
                value={targetSectionId}
                onChange={setTargetSectionId}
                allowDeselect={false}
              />
            </Box>
          )}
          {filteredItems.map((item) => (
            <WidgetItem
              key={item.kind}
              item={item}
              onSelect={() => void handleAdd(item.kind)}
              onFocus={() => {
                void loadWidgetDefinition(item.kind).catch(() => undefined);
                preloadWidgetEditModal();
              }}
              onPointerEnter={() => {
                void loadWidgetDefinition(item.kind).catch(() => undefined);
                preloadWidgetEditModal();
              }}
              disabled={loadingSelection !== null}
              loading={loadingSelection === item.kind}
              connectionStatus={getWidgetConnectionStatus({
                supportedIntegrations: item.supportedIntegrations,
                availableKinds,
                connectionOptional: widgetKindsWithOptionalIntegrations.has(item.kind),
              })}
            />
          ))}

          {isAdmin && (
            <>
              <Divider
                label={t("customWidget.page.list.title")}
                labelPosition="center"
                my="sm"
                style={{ gridColumn: "1 / -1" }}
              />
              {filteredCustomWidgets.map((def) => (
                <CatalogItem
                  key={def.id}
                  height={selectGridCardHeight}
                  label={def.name}
                  status={t("item.create.connectionStatus.noConnectionRequired")}
                  disabled={loadingSelection !== null}
                  busy={loadingSelection === `custom:${def.id}`}
                  onSelect={() => void handleAddCustomWidget(def)}
                  onFocus={() => {
                    void loadWidgetDefinition("customApi").catch(() => undefined);
                  }}
                  onPointerEnter={() => {
                    void loadWidgetDefinition("customApi").catch(() => undefined);
                  }}
                >
                  <Stack h="100%" gap="xs">
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                      {def.iconUrl ? (
                        <Image src={def.iconUrl} w={22} h={22} fit="contain" style={{ flexShrink: 0, marginTop: 2 }} />
                      ) : (
                        <IconApi size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                      )}
                      <Text lh={1.2} style={{ whiteSpace: "normal" }} fw={500} size="sm" lineClamp={2}>
                        {def.name}
                      </Text>
                    </Group>
                    <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" c="dimmed" lineClamp={1}>
                      {def.description ?? ""}
                    </Text>
                    <ConnectionStatusBadge status="noConnectionRequired" />
                  </Stack>
                </CatalogItem>
              ))}

              <Box style={{ gridColumn: "1 / -1" }}>
                {/* Opens in a new tab so unsaved board changes survive the detour. */}
                <Button
                  component="a"
                  href="/manage/custom-widgets/workshop"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="default"
                  fullWidth
                  leftSection={<IconBuildingStore size={16} />}
                >
                  {t("workshop.browseWorkshop")}
                </Button>
              </Box>
            </>
          )}

          {filteredItems.length === 0 && (!isAdmin || filteredCustomWidgets.length === 0) && (
            <Center p="xl">
              <Text c="dimmed">{t("common.noResults")}</Text>
            </Center>
          )}
        </SelectGridLayout>
      </Box>
    </Flex>
  );
};
const ItemSelectModalFrame = ({
  actions,
  innerProps,
}: {
  actions: { closeModal: () => void };
  innerProps: { boardId: string; initialIntegrationKind?: IntegrationKind; initialWidgetKind?: WidgetKind };
}) => {
  const utils = clientApi.useUtils();
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const canCreateIntegration = session?.user.permissions.includes("integration-create") ?? false;
  const t = useI18n();
  const { data: integrationData } = clientApi.integration.all.useQuery();
  const { data: customWidgetDefs } = clientApi.customWidget.available.useQuery(
    { boardId: innerProps.boardId },
    { enabled: isAdmin },
  );

  return (
    <ItemSelectModalContent
      actions={actions}
      integrationData={integrationData}
      customWidgetDefs={customWidgetDefs}
      ensureIntegrationDataAsync={() => utils.integration.all.ensureData()}
      isAdmin={isAdmin}
      canCreateIntegration={canCreateIntegration}
      initialSearch={
        innerProps.initialWidgetKind
          ? t(`widget.${innerProps.initialWidgetKind}.name`)
          : innerProps.initialIntegrationKind
            ? getIntegrationName(innerProps.initialIntegrationKind)
            : undefined
      }
    />
  );
};

export const ItemSelectModal = createModal<{
  boardId: string;
  initialIntegrationKind?: IntegrationKind;
  initialWidgetKind?: WidgetKind;
}>((props) => <ItemSelectModalFrame {...props} />).withOptions({
  defaultTitle: (t) => t("item.create.title"),
  size: modalSizeSelect,
});

const WidgetItem = ({
  item,
  onSelect,
  onFocus,
  onPointerEnter,
  disabled,
  loading,
  connectionStatus,
}: {
  item: {
    kind: WidgetKind;
    supportedIntegrations: IntegrationKind[];
    name: string;
    description: string;
    icon: TablerIcon;
  };
  onSelect: () => void;
  onFocus: () => void;
  onPointerEnter: () => void;
  disabled: boolean;
  loading: boolean;
  connectionStatus: WidgetConnectionStatus;
}) => {
  const t = useI18n();
  const statusLabel = t(`item.create.connectionStatus.${connectionStatus}`);

  return (
    <CatalogItem
      height={selectGridCardHeight}
      label={item.name}
      status={statusLabel}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      onSelect={onSelect}
      disabled={disabled}
      busy={loading}
    >
      <Stack h="100%" gap="xs">
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <item.icon size={22} style={{ flexShrink: 0, marginTop: 2 }} />
          <Text lh={1.2} style={{ whiteSpace: "normal" }} fw={500} size="sm" lineClamp={2}>
            {item.name}
          </Text>
        </Group>
        <Tooltip label={item.description} multiline w={250} disabled={!item.description}>
          <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" c="dimmed" lineClamp={1}>
            {item.description}
          </Text>
        </Tooltip>
        <ConnectionStatusBadge status={connectionStatus} />
        <SupportedIntegrations integrations={item.supportedIntegrations} />
      </Stack>
    </CatalogItem>
  );
};

const ConnectionStatusBadge = ({ status }: { status: WidgetConnectionStatus }) => {
  const t = useI18n();
  const color = status === "ready" ? "green" : status === "needsSetup" ? "yellow" : "gray";

  return (
    <Badge variant="light" color={color} size="xs" tt="none" w="fit-content" maw="100%">
      {t(`item.create.connectionStatus.${status}`)}
    </Badge>
  );
};

const SupportedIntegrations = ({ integrations }: { integrations: IntegrationKind[] }) => {
  if (integrations.length === 0) {
    return null;
  }

  const countToShow = integrations.length >= 8 ? 6 : 7;
  const moreCount = integrations.length - countToShow;

  return (
    <Group gap={2}>
      <Tooltip.Group closeDelay={100}>
        <Group gap={2}>
          {integrations.slice(0, countToShow).map((integration) => (
            <Tooltip key={integration} label={getIntegrationName(integration)} withArrow>
              <Avatar src={getIconUrl(integration)} size="xs" radius="xl" />
            </Tooltip>
          ))}
          {moreCount > 0 && (
            <Tooltip
              withArrow
              label={
                <>
                  {integrations.slice(countToShow).map((integration) => (
                    <div key={integration}>{getIntegrationName(integration)}</div>
                  ))}
                </>
              }
            >
              <Avatar radius="xl" size="xs">
                +{moreCount}
              </Avatar>
            </Tooltip>
          )}
        </Group>
      </Tooltip.Group>
    </Group>
  );
};
