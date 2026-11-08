import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Input,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconApi, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import {
  getBoardLaneColumnCount,
  getIntegrationName,
  getWidgetName,
  getRootSectionLane,
  integrationKinds,
  widgetDefaultSizes,
  widgetIntegrationSupport,
  widgetKinds,
  widgetKindsWithOptionalIntegrations,
} from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { SelectableCard } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import type { EmptySection } from "~/app/[locale]/boards/_types";
import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import { getSectionGridColumnCount } from "../sections/grid/section-grid-placements";
import { useItemActions } from "./item-actions";
import type { WidgetConnectionStatus } from "./item-select-data";
import {
  getWidgetConnectionStatus,
  matchesIntegrationSearch,
  resolveMatchingIntegrationsAsync,
  tryLockSelection,
  unlockSelection,
} from "./item-select-data";
import { LazyWidgetEditModal, preloadWidgetEditModal } from "./lazy-widget-edit-modal";
import { ConnectionStatusBadge, SupportedIntegrations } from "./widget-card-connection";
import { WorkshopWidgetSection, useFilteredWorkshopCatalog } from "./workshop-widget-section";

export { ConnectionStatusBadge, SupportedIntegrations } from "./widget-card-connection";

interface ItemSelectModalContentProps {
  actions: { closeModal: () => void };
  integrationData: RouterOutputs["integration"]["all"] | undefined;
  integrationError: boolean;
  customWidgetDefs: RouterOutputs["customWidget"]["available"] | undefined;
  ensureIntegrationDataAsync: () => Promise<RouterOutputs["integration"]["all"]>;
  isAdmin: boolean;
  canCreateIntegration: boolean;
  initialSearch?: string;
}

export interface WidgetItemData {
  kind: WidgetKind;
  supportedIntegrations: IntegrationKind[];
  icon: TablerIcon;
  name: string;
  description: string;
}

const selectGridCols = { base: 1, xs: 2, sm: 2, md: 3, lg: 4 };
const defaultWidgetSize = { width: 1, height: 1 };
const maximumWidgetHeight = 64;
const integrationFilterOptions = integrationKinds
  .filter((kind) => kind !== "mock")
  .map((kind) => ({ value: kind, label: getIntegrationName(kind) }))
  .toSorted((left, right) => left.label.localeCompare(right.label));
const filterKindsByValue = new Map<string, IntegrationKind>(
  integrationFilterOptions.map(({ value }) => [value, value]),
);
const WorkshopWidgetReview = dynamic(
  () => import("./workshop-widget-review").then((module) => module.WorkshopWidgetReview),
  {
    loading: () => (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    ),
  },
);

const ItemSelectModalContent = ({
  actions,
  integrationData,
  integrationError,
  customWidgetDefs,
  ensureIntegrationDataAsync,
  isAdmin,
  canCreateIntegration,
  initialSearch = "",
}: ItemSelectModalContentProps) => {
  const [search, setSearch] = useState(initialSearch);
  const [integrationFilter, setIntegrationFilter] = useState<IntegrationKind | null>(null);
  const [workshopSelection, setWorkshopSelection] = useState<string | null>(null);
  const t = useI18n();
  const utils = clientApi.useUtils();
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
  const effectiveSectionId = placementOptions.some(({ value }) => value === targetSectionId)
    ? targetSectionId
    : (placementOptions[0]?.value ?? null);
  const maximumWidgetSize = useMemo(() => {
    if (!effectiveSectionId) return defaultWidgetSize;
    return {
      width: Math.max(1, getSectionGridColumnCount(board, currentLayoutId, effectiveSectionId) ?? 1),
      height: maximumWidgetHeight,
    };
  }, [board, currentLayoutId, effectiveSectionId]);

  const [loadingSelection, setLoadingSelection] = useState<string | null>(null);
  const selectionLock = useRef(false);
  const pickerOpen = useRef(true);
  useEffect(() => {
    pickerOpen.current = true;
    return () => {
      pickerOpen.current = false;
    };
  }, []);
  const { createItem, removeItem } = useItemActions();

  const { openModal: openEditModal } = useModalAction(LazyWidgetEditModal);
  const { openModal: openIntegrationModal } = useModalAction(IntegrationSelectModal);
  const settings = useSettings();

  const availableKinds = useMemo(
    () =>
      new Set((integrationData ?? []).filter(({ permissions }) => permissions.hasUseAccess).map(({ kind }) => kind)),
    [integrationData],
  );
  const workshopAvailableKinds = useMemo(() => {
    if (!integrationData) return undefined;
    return new Set(integrationData.filter(({ permissions }) => permissions.hasFullAccess).map(({ kind }) => kind));
  }, [integrationData]);
  const searchQuery = search.trim().toLowerCase();
  const workshop = useFilteredWorkshopCatalog({
    enabled: isAdmin,
    searchQuery,
    integrationFilter,
    availableKinds: workshopAvailableKinds,
  });

  const items = useMemo<WidgetItemData[]>(
    () =>
      widgetKinds
        .filter((kind) => kind !== "customApi")
        .map((kind) => {
          let description: string;
          if (kind === "mediaMissing") {
            description = t("widget.mediaMissing.description", {
              radarr: getIntegrationName("radarr"),
              sonarr: getIntegrationName("sonarr"),
              sportarr: getIntegrationName("sportarr"),
              bindery: getIntegrationName("bindery"),
            });
          } else {
            description = t(`widget.${kind}.description`);
          }

          return {
            kind,
            supportedIntegrations: (widgetIntegrationSupport[kind] ?? []).filter(
              (integration) => integration !== "mock",
            ),
            icon: widgetCatalogIcons[kind],
            name: getWidgetName(kind, t),
            description,
          };
        })
        .sort((itemA, itemB) => itemA.name.localeCompare(itemB.name)),
    [t],
  );

  const filteredItems = useMemo(() => {
    return items.flatMap((item) => {
      if (integrationFilter && !item.supportedIntegrations.includes(integrationFilter)) return [];
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery) &&
        !item.supportedIntegrations.some((kind) => matchesIntegrationSearch(kind, searchQuery))
      )
        return [];
      let connectionStatus: WidgetConnectionStatus = "noConnectionRequired";
      if (integrationData) {
        connectionStatus = getWidgetConnectionStatus({
          supportedIntegrations: item.supportedIntegrations,
          availableKinds,
          connectionOptional: widgetKindsWithOptionalIntegrations.has(item.kind),
        });
      }
      return [{ ...item, connectionStatus }];
    });
  }, [availableKinds, integrationData, integrationFilter, items, searchQuery]);

  const filteredCustomWidgets = useMemo(() => {
    return (customWidgetDefs ?? []).filter((definition) => {
      if (integrationFilter && !definition.integrationKinds.some((kind) => kind === integrationFilter)) return false;
      return (
        definition.name.toLowerCase().includes(searchQuery) ||
        definition.integrationKinds.some((kind) => matchesIntegrationSearch(kind, searchQuery))
      );
    });
  }, [customWidgetDefs, integrationFilter, searchQuery]);

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
    const wasRelocated = effectiveSectionId !== null && actualSectionId !== effectiveSectionId && actualDestination;
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
      if (!pickerOpen.current) return;
      const itemId = createId();
      const initialSize = widgetDefaultSizes.customApi ?? defaultWidgetSize;
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
          onSuccessfulEdit: ({ options: configuredOptions, advancedOptions }, selectedSize) => {
            const updatedBoard = createItem({
              id: itemId,
              kind: "customApi",
              integrationIds: [],
              options: configuredOptions,
              targetSectionId: effectiveSectionId ?? undefined,
              advancedOptions,
              size: selectedSize ?? initialSize,
            });
            notifyCreated(updatedBoard, itemId, customWidgetDefinition.name);
          },
          integrationData: [],
          integrationSupport: false,
          settings,
          previewResize: { initialSize, maximumSize: maximumWidgetSize },
          previewSectionId: effectiveSectionId ?? undefined,
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

  const handleWorkshopInstalled = async (definitionId: string) => {
    if (!pickerOpen.current) return;
    try {
      // The picker may still have a pre-import query in flight; start a fresh request for the imported definition.
      const definitions = await utils.client.customWidget.available.query({ boardId: board.id });
      if (!pickerOpen.current) return;
      // Keep an older response from replacing the fresh list when the picker reopens.
      await utils.customWidget.available.cancel({ boardId: board.id });
      if (!pickerOpen.current) return;
      utils.customWidget.available.setData({ boardId: board.id }, definitions);
      const installed = definitions.find(({ id }) => id === definitionId);
      if (!installed) throw new Error(t("item.create.notification.error.message"));
      await handleAddCustomWidget(installed);
    } catch (error) {
      if (pickerOpen.current) notifyDefinitionLoadError(error);
    } finally {
      if (pickerOpen.current) setWorkshopSelection(null);
    }
  };

  const handleAdd = async (kind: WidgetKind) => {
    if (!tryLockSelection(selectionLock)) return;
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
      const initialSize = widgetDefaultSizes[kind] ?? defaultWidgetSize;
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
            onSuccessfulEdit: ({ options, integrationIds: newIntegrationIds, advancedOptions }, selectedSize) => {
              const updatedBoard = createItem({
                id: itemId,
                kind,
                options,
                integrationIds: newIntegrationIds,
                targetSectionId: effectiveSectionId ?? undefined,
                advancedOptions,
                size: selectedSize ?? initialSize,
              });
              if (!notifyCreated(updatedBoard, itemId, getWidgetName(kind, t))) return;
            },
            integrationData: availableIntegrations,
            integrationSupport: hasIntegrationSupport,
            settings,
            previewResize: { initialSize, maximumSize: maximumWidgetSize },
            previewSectionId: effectiveSectionId ?? undefined,
          },
          {
            title: (titleT) => `${titleT("item.edit.title")} - ${getWidgetName(kind, titleT)}`,
          },
        );
      };
      const integrationsRequired =
        hasIntegrationSupport && (!("integrationsRequired" in definition) || definition.integrationsRequired !== false);

      if (integrationsRequired && matchingIntegrationCount === 0) {
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

  const renderItem = (item: WidgetItemData & { connectionStatus: WidgetConnectionStatus }) => {
    const preload = () => {
      void loadWidgetDefinition(item.kind).catch(() => undefined);
      preloadWidgetEditModal();
    };
    return (
      <WidgetItem
        key={item.kind}
        item={item}
        onSelect={() => void handleAdd(item.kind)}
        onFocus={preload}
        onPointerEnter={preload}
        disabled={loadingSelection !== null}
        loading={loadingSelection === item.kind}
        connectionStatus={item.connectionStatus}
        availableKinds={integrationData && availableKinds}
      />
    );
  };

  if (workshopSelection) {
    return (
      <WorkshopWidgetReview
        submissionId={workshopSelection}
        onBack={() => setWorkshopSelection(null)}
        onImported={(definitionId) => void handleWorkshopInstalled(definitionId)}
      />
    );
  }

  return (
    <Stack gap="md">
      {/* Top Search & Destination Selector */}
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Box style={{ flex: "1 1 240px", minWidth: 200 }}>
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            placeholder={`${t("item.create.search")}...`}
            aria-label={t("item.create.search")}
            data-autofocus
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                loadingSelection === null &&
                filteredItems.length === 1 &&
                filteredItems[0] &&
                filteredCustomWidgets.length === 0 &&
                (!isAdmin || (!workshop.isPending && workshop.items.length === 0))
              ) {
                void handleAdd(filteredItems[0].kind);
              }
            }}
          />
        </Box>

        <Select
          size="xs"
          placeholder={t("item.create.integrationFilter")}
          aria-label={t("item.create.integrationFilter")}
          searchable
          clearable
          data={integrationFilterOptions}
          value={integrationFilter}
          onChange={(value) => setIntegrationFilter(filterKindsByValue.get(value ?? "") ?? null)}
          renderOption={({ option }) => {
            const kind = filterKindsByValue.get(option.value);
            if (!integrationData || (kind && availableKinds.has(kind))) {
              return <Text size="sm">{option.label}</Text>;
            }
            return (
              <Text size="sm" c="dimmed">
                {t("item.create.integrationNotConnected", { name: option.label })}
              </Text>
            );
          }}
        />

        {placementOptions.length > 1 && (
          <Box style={{ flex: "0 1 280px", minWidth: 200 }}>
            <Select
              label={t("item.create.destination.label")}
              data={placementOptions}
              value={effectiveSectionId}
              onChange={setTargetSectionId}
              allowDeselect={false}
              size="xs"
            />
          </Box>
        )}
      </Group>

      {/* Grid of Widgets */}
      <SimpleGrid cols={selectGridCols} spacing="sm">
        {filteredItems.filter(({ connectionStatus }) => connectionStatus !== "needsSetup").map(renderItem)}

        {isAdmin && filteredCustomWidgets.length > 0 && (
          <>
            <Divider
              label={
                <Group gap="xs">
                  <IconApi size={14} />
                  <Text size="xs" fw={600}>
                    {t("common.entity.customWidgets")}
                  </Text>
                </Group>
              }
              labelPosition="center"
              my="sm"
              style={{ gridColumn: "1 / -1" }}
            />
            {filteredCustomWidgets.map((def) => (
              <SelectableCard
                key={def.id}
                onClick={() => void handleAddCustomWidget(def)}
                aria-label={def.name}
                icon={
                  def.iconUrl ? (
                    <Image src={def.iconUrl} w={24} h={24} fit="contain" style={{ flexShrink: 0 }} />
                  ) : (
                    <ThemeIcon size={34} radius="md" variant="light" color="primaryColor">
                      <IconApi size={20} />
                    </ThemeIcon>
                  )
                }
                title={def.name}
                description={def.description ?? ""}
                disabled={loadingSelection !== null}
                footerLeft={
                  def.integrationKinds.length > 0 && (
                    <SupportedIntegrations
                      integrations={def.integrationKinds}
                      availableKinds={workshopAvailableKinds}
                    />
                  )
                }
                footerRight={
                  <Text size="xs" c="dimmed">
                    {t("item.create.customWidget")}
                  </Text>
                }
              />
            ))}
          </>
        )}
        {isAdmin && (
          <WorkshopWidgetSection
            catalog={workshop}
            availableKinds={workshopAvailableKinds}
            integrationError={integrationError}
            search={search.trim()}
            integrationFilter={integrationFilter}
            disabled={loadingSelection !== null}
            onSelect={setWorkshopSelection}
          />
        )}
        {filteredItems.filter(({ connectionStatus }) => connectionStatus === "needsSetup").map(renderItem)}
      </SimpleGrid>

      {!isAdmin && filteredItems.length === 0 && (
        <Center p="xl">
          <Text c="dimmed">{t("common.noResults")}</Text>
        </Center>
      )}
    </Stack>
  );
};

// =========================================================================
// WidgetItem: SelectableCard with Inset, Title, Status Badge, and Footer
// =========================================================================
export const WidgetItem = ({
  item,
  onSelect,
  onFocus,
  onPointerEnter,
  disabled,
  loading,
  connectionStatus,
  availableKinds,
}: {
  item: WidgetItemData;
  onSelect: () => void;
  onFocus?: () => void;
  onPointerEnter?: () => void;
  disabled: boolean;
  loading: boolean;
  connectionStatus: WidgetConnectionStatus;
  availableKinds?: ReadonlySet<IntegrationKind>;
}) => {
  return (
    <SelectableCard
      disabled={disabled}
      loading={loading}
      onClick={onSelect}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      aria-label={item.name}
      icon={
        <ThemeIcon size={34} radius="md" variant="light" color="primaryColor">
          <item.icon size={20} />
        </ThemeIcon>
      }
      title={item.name}
      topRight={<ConnectionStatusBadge status={connectionStatus} />}
      description={item.description}
      footerLeft={<SupportedIntegrations integrations={item.supportedIntegrations} availableKinds={availableKinds} />}
    />
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
  const integrationQuery = clientApi.integration.all.useQuery();
  const { data: customWidgetDefs } = clientApi.customWidget.available.useQuery(
    { boardId: innerProps.boardId },
    { enabled: isAdmin },
  );

  return (
    <ItemSelectModalContent
      actions={actions}
      integrationData={integrationQuery.data}
      integrationError={integrationQuery.isError && integrationQuery.data === undefined}
      customWidgetDefs={customWidgetDefs}
      ensureIntegrationDataAsync={() => utils.integration.all.ensureData()}
      isAdmin={isAdmin}
      canCreateIntegration={canCreateIntegration}
      initialSearch={
        innerProps.initialWidgetKind
          ? getWidgetName(innerProps.initialWidgetKind, t)
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
