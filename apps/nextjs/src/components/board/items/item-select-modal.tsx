import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  CloseButton,
  Divider,
  Flex,
  Group,
  Image,
  Input,
  Loader,
  LoadingOverlay,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useElementSize } from "@mantine/hooks";
import { IconApi, IconBuildingStore, IconPlus, IconSearch, IconSparkles } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import {
  getBoardLaneColumnCount,
  getIconUrl,
  getIntegrationName,
  getRootSectionLane,
  widgetIntegrationSupport,
  widgetKinds,
  widgetKindsWithOptionalIntegrations,
} from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { createModal, useModalAction } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar, SelectableCard } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";
import { widgetCatalogIcons } from "@homarr/widgets/catalog";
import { WidgetError } from "@homarr/widgets/errors";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";
import { getInputForType } from "@homarr/widgets/inputs";
import { FormProvider, useForm } from "@homarr/widgets/inputs/form";
import { loadWidgetDefinition, loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";
import type { WidgetComponentProps, WidgetDefinition } from "@homarr/widgets/definition";
import type { OptionsBuilderResult } from "@homarr/widgets/options";
import type { IntegrationSelectOption } from "@homarr/widgets/widget-integration-select";
import { WidgetIntegrationSelect } from "@homarr/widgets/widget-integration-select";

import { NewIntegrationForm } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import type { CreatedIntegrationResult } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import type { WidgetEditModalState } from "@homarr/widgets/modals";
import type { EmptySection } from "~/app/[locale]/boards/_types";
import { useSetupAnalytics } from "~/components/create/setup-analytics";
import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
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
  initialWidgetKind?: WidgetKind;
}

interface WidgetItemData {
  kind: WidgetKind;
  supportedIntegrations: IntegrationKind[];
  icon: TablerIcon;
  name: string;
  description: string;
}

const ItemSelectModalContent = ({
  actions,
  integrationData,
  customWidgetDefs,
  ensureIntegrationDataAsync,
  isAdmin,
  canCreateIntegration,
  initialSearch = "",
  initialWidgetKind,
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
  const effectiveSectionId = placementOptions.some(({ value }) => value === targetSectionId)
    ? targetSectionId
    : (placementOptions[0]?.value ?? null);

  const [loadingSelection, setLoadingSelection] = useState<string | null>(null);
  const selectionLock = useRef(false);
  const { createItem, removeItem } = useItemActions();

  const { openModal: openEditModal } = useModalAction(LazyWidgetEditModal);
  const { openModal: openIntegrationModal } = useModalAction(IntegrationSelectModal);
  const settings = useSettings();
  const trackSetup = useSetupAnalytics();
  const flowStartedAt = useRef<number | null>(null);

  const availableKinds = useMemo(
    () => new Set((integrationData ?? []).filter(({ permissions }) => permissions.hasUseAccess).map((i) => i.kind)),
    [integrationData],
  );

  const items = useMemo<WidgetItemData[]>(
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

  // Selected item state for live preview pane - only shown when explicitly selected
  const [selectedKind, setSelectedKind] = useState<WidgetKind | null>(initialWidgetKind ?? null);

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
          onSuccessfulEdit: ({ options: configuredOptions, advancedOptions }: WidgetEditModalState) => {
            const updatedBoard = createItem({
              id: itemId,
              kind: "customApi",
              integrationIds: [],
              options: configuredOptions,
              targetSectionId: effectiveSectionId ?? undefined,
              advancedOptions,
            });
            notifyCreated(updatedBoard, itemId, customWidgetDefinition.name);
          },
          integrationData: [],
          integrationSupport: false,
          settings,
        },
        {
          title(translate) {
            return `${translate("item.edit.title")} - ${customWidgetDefinition.name}`;
          },
        },
      );
    } catch (error) {
      notifyDefinitionLoadError(error);
    } finally {
      unlockSelection(selectionLock);
      setLoadingSelection(null);
    }
  };

  const handleDirectAdd = async (
    kind: WidgetKind,
    configuredOptions?: Record<string, unknown>,
    integrationIds?: string[],
  ) => {
    if (!tryLockSelection(selectionLock)) return;
    flowStartedAt.current = performance.now();
    trackSetup("widget-started", { entryPoint: "board", intent: kind });
    setLoadingSelection(kind);
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
      const defaultOptions = configuredOptions ?? reduceWidgetOptionsWithDefinition(definition, settings);
      const selectedIntegrationIds =
        integrationIds ?? matchingIntegrations.slice(0, maxIntegrations).map((integration) => integration.id);

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

        openIntegrationModal({
          allowedKinds: (definition.supportedIntegrations ?? []).filter((integration) => integration !== "mock"),
          onSuccess: (result: CreatedIntegrationResult | undefined) => {
            if (result) {
              trackSetup("dependency-resolved-inline", {
                entryPoint: "board",
                intent: kind,
                outcome: "continued",
                canResolveInline: true,
              });
              const updatedBoard = createItem({
                id: itemId,
                kind,
                options: defaultOptions,
                integrationIds: [result.integration.id],
                targetSectionId: effectiveSectionId ?? undefined,
                advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
              });
              notifyCreated(updatedBoard, itemId, t(`widget.${kind}.name`));
            }
          },
        });
        return;
      }

      actions.closeModal();
      const updatedBoard = createItem({
        id: itemId,
        kind,
        options: defaultOptions,
        integrationIds: selectedIntegrationIds,
        targetSectionId: effectiveSectionId ?? undefined,
        advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
      });
      if (!notifyCreated(updatedBoard, itemId, t(`widget.${kind}.name`))) return;
      trackSetup("widget-completed", {
        entryPoint: "board",
        intent: kind,
        outcome: "completed",
        elapsedMs: flowStartedAt.current ? Math.round(performance.now() - flowStartedAt.current) : undefined,
      });
    } catch (error) {
      notifyDefinitionLoadError(error);
    } finally {
      unlockSelection(selectionLock);
      setLoadingSelection(null);
    }
  };

  const selectedItemData = selectedKind ? items.find((item) => item.kind === selectedKind) : null;
  const isPreviewOpen = Boolean(selectedItemData);

  return (
    <Stack gap="md">
      {/* Top Search and Placement Controls */}
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
                filteredItems[0]
              ) {
                void handleDirectAdd(filteredItems[0].kind);
              }
            }}
          />
        </Box>

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

      {/* Animated Split Container */}
      <Flex
        gap="md"
        align="stretch"
        direction={{ base: "column", lg: "row" }}
        style={{ minHeight: 480, position: "relative" }}
      >
        {/* Left Column: Widget Cards Grid */}
        <Box
          style={{
            flex: isPreviewOpen ? "0 0 440px" : "1 1 100%",
            maxWidth: isPreviewOpen ? "460px" : "100%",
            width: "100%",
            transition: "flex-basis 300ms cubic-bezier(0.4, 0, 0.2, 1), max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <ScrollArea.Autosize mah="72vh" offsetScrollbars>
            <Stack gap="md" pt="xs" pr="xs" px={4}>
              <SimpleGrid
                cols={isPreviewOpen ? { base: 1, sm: 2 } : { base: 1, xs: 2, sm: 2, md: 3, lg: 4 }}
                spacing="sm"
              >
                {filteredItems.map((item) => (
                  <WidgetItem
                    key={item.kind}
                    item={item}
                    isSelected={selectedKind === item.kind}
                    onSelect={() => setSelectedKind((current) => (current === item.kind ? null : item.kind))}
                    disabled={loadingSelection !== null}
                    loading={loadingSelection === item.kind}
                    connectionStatus={getWidgetConnectionStatus({
                      supportedIntegrations: item.supportedIntegrations,
                      availableKinds,
                      connectionOptional: widgetKindsWithOptionalIntegrations.has(item.kind),
                    })}
                  />
                ))}
              </SimpleGrid>

              {/* Custom Widgets Section for Admins */}
              {isAdmin && (
                <>
                  <Divider
                    label={
                      <Group gap="xs">
                        <IconApi size={14} />
                        <Text size="xs" fw={600}>
                          {t("customWidget.page.list.title")}
                        </Text>
                      </Group>
                    }
                    labelPosition="center"
                    my="md"
                  />

                  <SimpleGrid
                    cols={isPreviewOpen ? { base: 1, sm: 2 } : { base: 1, xs: 2, sm: 2, md: 3, lg: 4 }}
                    spacing="sm"
                  >
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
                        footerLeft={
                          <Text size="xs" c="dimmed">
                            Custom Widget
                          </Text>
                        }
                      />
                    ))}
                  </SimpleGrid>

                  <Box mt="xs">
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
            </Stack>
          </ScrollArea.Autosize>
        </Box>

        {/* Right Column: Live Preview & Interactive Settings Panel (Only shown when an item is selected) */}
        {selectedItemData && (
          <Box
            style={{
              flex: "1 1 0%",
              minWidth: 0,
              animation: "fadeIn 250ms ease forwards",
            }}
          >
            <WidgetLivePreviewAndConfigPane
              key={selectedItemData.kind}
              item={selectedItemData}
              boardId={board.id}
              integrationData={integrationData ?? []}
              canCreateIntegration={canCreateIntegration}
              onClose={() => setSelectedKind(null)}
              onOpenConnectIntegration={() => {
                const supported = widgetIntegrationSupport[selectedItemData.kind] ?? [];
                openIntegrationModal({
                  allowedKinds: supported.filter((i) => i !== "mock"),
                  onSuccess: (result) => {
                    if (result) {
                      void ensureIntegrationDataAsync();
                    }
                  },
                });
              }}
              onAddWidget={(configuredOptions, integrationIds) =>
                void handleDirectAdd(selectedItemData.kind, configuredOptions, integrationIds)
              }
              isAdding={loadingSelection === selectedItemData.kind}
            />
          </Box>
        )}
      </Flex>
    </Stack>
  );
};

// =========================================================================
// WidgetLivePreviewAndConfigPane: Asynchronously Loads Resources & Renders Content
// =========================================================================
interface WidgetLivePreviewAndConfigPaneProps {
  item: WidgetItemData;
  boardId: string;
  integrationData: RouterOutputs["integration"]["all"];
  canCreateIntegration: boolean;
  onClose: () => void;
  onOpenConnectIntegration: () => void;
  onAddWidget: (options: Record<string, unknown>, integrationIds: string[]) => void;
  isAdding: boolean;
}

const WidgetLivePreviewAndConfigPane = ({
  item,
  boardId,
  integrationData,
  canCreateIntegration,
  onClose,
  onOpenConnectIntegration,
  onAddWidget,
  isAdding,
}: WidgetLivePreviewAndConfigPaneProps) => {
  const [resources, setResources] = useState<{
    definition: WidgetDefinition;
    Component: ComponentType<WidgetComponentProps<WidgetKind>>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadWidgetResources(item.kind)
      .then((res) => {
        if (active) {
          setResources(res);
          setIsLoading(false);
        }
      })
      .catch((_err) => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [item.kind]);

  if (isLoading || !resources) {
    return (
      <Card withBorder radius="md" padding="md" h="100%" shadow="xs">
        <Center h={320}>
          <Loader size="md" />
        </Center>
      </Card>
    );
  }

  return (
    <WidgetLivePreviewAndConfigContent
      key={item.kind}
      item={item}
      definition={resources.definition}
      Component={resources.Component}
      boardId={boardId}
      integrationData={integrationData}
      canCreateIntegration={canCreateIntegration}
      onClose={onClose}
      onOpenConnectIntegration={onOpenConnectIntegration}
      onAddWidget={onAddWidget}
      isAdding={isAdding}
    />
  );
};

// =========================================================================
// WidgetLivePreviewAndConfigContent: Form State & Real-time Live Preview
// =========================================================================
interface WidgetLivePreviewAndConfigContentProps {
  item: WidgetItemData;
  definition: WidgetDefinition;
  Component: ComponentType<WidgetComponentProps<WidgetKind>>;
  boardId: string;
  integrationData: RouterOutputs["integration"]["all"];
  canCreateIntegration: boolean;
  onClose: () => void;
  onOpenConnectIntegration: () => void;
  onAddWidget: (options: Record<string, unknown>, integrationIds: string[]) => void;
  isAdding: boolean;
}

const WidgetLivePreviewAndConfigContent = ({
  item,
  definition,
  Component,
  boardId,
  integrationData,
  canCreateIntegration,
  onClose,
  onOpenConnectIntegration,
  onAddWidget,
  isAdding,
}: WidgetLivePreviewAndConfigContentProps) => {
  const t = useI18n();
  const settings = useSettings();

  const { data: selectableApps } = clientApi.app.selectable.useQuery(undefined, {
    enabled: item.kind === "app",
  });

  const utils = clientApi.useUtils();
  const supportedKinds = useMemo(() => {
    if (!("supportedIntegrations" in definition)) return [];
    return (definition.supportedIntegrations ?? []).filter((k) => k !== "mock");
  }, [definition]);

  // Filter integrations compatible with this widget
  const compatibleIntegrations: IntegrationSelectOption[] = useMemo(() => {
    if (!("supportedIntegrations" in definition)) return [];
    const supported = definition.supportedIntegrations ?? [];
    return (integrationData ?? [])
      .filter((i) => supported.includes(i.kind))
      .map((i) => ({
        id: i.id,
        name: i.name,
        kind: i.kind,
        url: i.url,
      }));
  }, [definition, integrationData]);

  const [showInlineConnect, setShowInlineConnect] = useState<boolean>(compatibleIntegrations.length === 0);
  const [inlineConnectKind, setInlineConnectKind] = useState<IntegrationKind | null>(supportedKinds[0] ?? null);

  const supportsMock =
    "supportedIntegrations" in definition && (definition.supportedIntegrations ?? []).includes("mock");
  const mockIntegration = supportsMock ? (integrationData ?? []).find((i) => i.kind === "mock") : null;

  // Initial options
  const initialOptions = useMemo(() => {
    const defaultOptions = reduceWidgetOptionsWithDefinition(definition, settings);
    if (item.kind === "app" && !defaultOptions.appId && selectableApps?.[0]) {
      return {
        ...defaultOptions,
        appId: selectableApps[0].id,
      };
    }
    return defaultOptions;
  }, [definition, item.kind, selectableApps, settings]);

  // Initial integration IDs: auto-select single choice if available
  const initialIntegrationIds = useMemo(() => {
    if (!("supportedIntegrations" in definition)) return [];
    const maxIntegrations = "maxIntegrations" in definition ? (definition.maxIntegrations ?? Infinity) : Infinity;
    if (compatibleIntegrations.length === 1 && compatibleIntegrations[0]) {
      return [compatibleIntegrations[0].id];
    }
    return compatibleIntegrations.slice(0, maxIntegrations).map((i) => i.id);
  }, [compatibleIntegrations, definition]);

  const form = useForm({
    initialValues: {
      options: initialOptions,
      integrationIds: initialIntegrationIds,
    },
  });

  const previewIntegrationIds =
    form.values.integrationIds.length > 0 ? form.values.integrationIds : mockIntegration ? [mockIntegration.id] : [];

  const { mutateAsync: createMockIntegration, isPending: isCreatingMock } = clientApi.integration.create.useMutation({
    async onSuccess(data) {
      await utils.integration.all.invalidate();
      if (data && "integration" in data && data.integration) {
        form.setFieldValue("integrationIds", [
          ...(maxIntegrations > 1 ? form.values.integrationIds : []),
          data.integration.id,
        ]);
        setShowInlineConnect(false);
        showSuccessNotification({
          title: "Demo Service Connected",
          message: "A mock integration was created and connected for testing.",
        });
      }
    },
  });

  const handleCreateMockService = async () => {
    try {
      await createMockIntegration({
        name: "Demo Service",
        url: "https://demo.homarr.dev",
        kind: "mock",
        secrets: [],
        attemptSearchEngineCreation: false,
      });
    } catch (error) {
      showErrorNotification({
        title: t("common.error"),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleInlineCreateSuccess = (result?: CreatedIntegrationResult) => {
    void utils.integration.all.invalidate();
    if (result?.integration?.id) {
      form.setFieldValue("integrationIds", [
        ...(maxIntegrations > 1 ? form.values.integrationIds : []),
        result.integration.id,
      ]);
    }
    setShowInlineConnect(false);
    showSuccessNotification({
      message: t("integration.page.create.notification.success.message"),
    });
  };

  const optionsDefinition = useMemo(() => {
    return definition.createOptions(settings) as Record<string, OptionsBuilderResult[string]>;
  }, [definition, settings]);

  const hasIntegrationSupport = "supportedIntegrations" in definition;
  const integrationsRequired =
    hasIntegrationSupport && (!("integrationsRequired" in definition) || definition.integrationsRequired !== false);
  const maxIntegrations = "maxIntegrations" in definition ? (definition.maxIntegrations ?? Infinity) : Infinity;

  const { ref: previewContainerRef, width: previewWidth, height: previewHeight } = useElementSize();
  const board = useRequiredBoard();

  const handleUpdatePartialOptions = useCallback(
    ({ newOptions }: { newOptions: Record<string, unknown> }) => {
      form.setFieldValue("options", {
        ...form.values.options,
        ...newOptions,
      });
    },
    [form],
  );

  return (
    <Card withBorder radius="md" padding="md" h="100%" shadow="xs" style={{ display: "flex", flexDirection: "column" }}>
      {/* Header Banner */}
      <Group
        justify="space-between"
        align="center"
        pb="sm"
        mb="xs"
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        <Group gap="xs">
          <ThemeIcon size={36} radius="md" variant="light" color="primaryColor">
            <item.icon size={22} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="md" lh={1.2}>
              {item.name}
            </Text>
            <Text size="xs" c="dimmed">
              Live Preview & Options
            </Text>
          </Box>
        </Group>

        <Group gap="xs">
          <Button
            color="primaryColor"
            size="sm"
            leftSection={<IconPlus size={16} />}
            loading={isAdding}
            onClick={() => onAddWidget(form.values.options, form.values.integrationIds)}
          >
            {t("common.action.add")}
          </Button>
          <CloseButton onClick={onClose} aria-label="Close preview" />
        </Group>
      </Group>

      {/* Live Widget Preview Frame (Simulating a 3x3 board widget tile) */}
      <Box mb="md">
        <Group justify="space-between" align="center" mb={6}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.5px">
            Preview (3×3)
          </Text>
          {form.values.integrationIds.length === 0 && Boolean(mockIntegration) && hasIntegrationSupport && (
            <Badge variant="subtle" color="teal" size="xs">
              Showing Demo / Mock Data
            </Badge>
          )}
        </Group>

        <Center w="100%">
          <Paper
            ref={previewContainerRef}
            withBorder
            radius={board.itemRadius}
            p={0}
            bg="light-dark(var(--mantine-color-body), var(--mantine-color-dark-7))"
            style={{
              width: "100%",
              maxWidth: 360,
              height: 360,
              overflow: "hidden",
              position: "relative",
              containerType: "size",
            }}
          >
            <Box w="100%" h="100%" style={{ overflow: "hidden", position: "relative" }}>
              <QueryErrorResetBoundary>
                {({ reset }) => (
                  <ErrorBoundary
                    onReset={reset}
                    resetKeys={[form.values.options, previewIntegrationIds]}
                    fallbackRender={({ resetErrorBoundary, error }) => (
                      <Center h="100%" p="md">
                        <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
                      </Center>
                    )}
                  >
                    <Throw
                      error={new NoIntegrationSelectedError()}
                      when={hasIntegrationSupport && previewIntegrationIds.length === 0 && integrationsRequired}
                    />
                    <Component
                      options={form.values.options as never}
                      integrationIds={previewIntegrationIds}
                      width={previewWidth || 360}
                      height={previewHeight || 360}
                      isEditMode={false}
                      displayMode="compact"
                      boardId={boardId}
                      itemId="preview"
                      setOptions={handleUpdatePartialOptions}
                    />
                  </ErrorBoundary>
                )}
              </QueryErrorResetBoundary>
            </Box>
          </Paper>
        </Center>
      </Box>

      {/* Scrollable Configuration Form */}
      <Box style={{ flex: "1 1 0%", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.5px" mb={6}>
          Widget Settings
        </Text>
        <ScrollArea.Autosize mah="36vh" offsetScrollbars>
          <FormProvider form={form}>
            <Stack gap="sm" pr="xs" pb="xs">
              {/* Integration Configuration / In-Place Connection */}
              {hasIntegrationSupport && (
                <Paper
                  withBorder
                  p="sm"
                  radius="md"
                  bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))"
                >
                  <Stack gap="xs">
                    {/* Existing Integrations Dropdown (when not creating inline) */}
                    {compatibleIntegrations.length > 0 && !showInlineConnect && (
                      <Stack gap="xs">
                        <WidgetIntegrationSelect
                          label={t("item.edit.field.integrations.label")}
                          data={compatibleIntegrations}
                          canSelectMultiple={maxIntegrations > 1}
                          withAsterisk={integrationsRequired}
                          {...form.getInputProps("integrationIds")}
                        />
                        {canCreateIntegration && supportedKinds.length > 0 && (
                          <Group justify="flex-end">
                            <Button
                              variant="subtle"
                              color="primaryColor"
                              size="xs"
                              leftSection={<IconPlus size={14} />}
                              onClick={() => {
                                setInlineConnectKind(supportedKinds[0] ?? null);
                                setShowInlineConnect(true);
                              }}
                            >
                              {t("integration.action.create")}
                            </Button>
                          </Group>
                        )}
                      </Stack>
                    )}

                    {/* Inline Connect Form */}
                    {showInlineConnect && canCreateIntegration && supportedKinds.length > 0 && (
                      <Stack gap="sm">
                        <Group justify="space-between" align="center">
                          <Group gap="xs">
                            <IntegrationAvatar kind={inlineConnectKind ?? supportedKinds[0]!} size="sm" />
                            <Text fw={700} size="sm">
                              Connect {getIntegrationName(inlineConnectKind ?? supportedKinds[0]!)}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            {supportsMock && (
                              <Button
                                variant="light"
                                color="teal"
                                size="xs"
                                leftSection={<IconSparkles size={14} />}
                                loading={isCreatingMock}
                                onClick={handleCreateMockService}
                              >
                                Use Demo Service
                              </Button>
                            )}
                            {compatibleIntegrations.length > 0 && (
                              <Button variant="subtle" size="xs" onClick={() => setShowInlineConnect(false)}>
                                {t("common.action.cancel")}
                              </Button>
                            )}
                          </Group>
                        </Group>

                        {/* Multiple choice selector if widget supports >1 integration kind */}
                        {supportedKinds.length > 1 && (
                          <SegmentedControl
                            size="xs"
                            value={inlineConnectKind ?? supportedKinds[0]!}
                            onChange={(val) => setInlineConnectKind(val as IntegrationKind)}
                            data={supportedKinds.map((kind) => ({
                              value: kind,
                              label: getIntegrationName(kind),
                            }))}
                          />
                        )}

                        <NewIntegrationForm
                          key={inlineConnectKind ?? supportedKinds[0]!}
                          kind={inlineConnectKind ?? supportedKinds[0]!}
                          onSuccess={handleInlineCreateSuccess}
                          onCancel={compatibleIntegrations.length > 0 ? () => setShowInlineConnect(false) : undefined}
                        />
                      </Stack>
                    )}

                    {/* No Connected Services and cannot create */}
                    {compatibleIntegrations.length === 0 && !canCreateIntegration && (
                      <Stack gap="xs">
                        <Text size="xs" fw={700}>
                          No Connected Services
                        </Text>
                        <Text size="xs" c="dimmed">
                          This widget requires a connected service (
                          {definition?.supportedIntegrations?.map(getIntegrationName).join(", ")}).
                        </Text>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Dynamic Option Inputs */}
              {Object.entries(optionsDefinition).map(([key, value]) => {
                const InputComponent = getInputForType(value.type);
                if (
                  !InputComponent ||
                  value.shouldHide?.(
                    form.values.options as never,
                    compatibleIntegrations
                      .filter(({ id }) => form.values.integrationIds.includes(id))
                      .map(({ kind }) => kind),
                  )
                ) {
                  return null;
                }

                return (
                  <InputComponent
                    key={key}
                    kind={item.kind as never}
                    property={key}
                    options={value as never}
                    initialOptions={form.values.options}
                    boardId={boardId}
                  />
                );
              })}

              {Object.keys(optionsDefinition).length === 0 &&
                (!hasIntegrationSupport || compatibleIntegrations.length === 0) && (
                  <Center p="md">
                    <Text size="xs" c="dimmed">
                      This widget does not require additional configuration.
                    </Text>
                  </Center>
                )}
            </Stack>
          </FormProvider>
        </ScrollArea.Autosize>
      </Box>
    </Card>
  );
};

const Throw = ({ when, error }: { when: boolean; error: Error }) => {
  if (when) throw error;
  return null;
};

// =========================================================================
// WidgetItem: Variant 3 (Dashboard Inset) with Variant 4 (Fuller Icon & MD text)
// =========================================================================
export const WidgetItem = ({
  item,
  isSelected,
  onSelect,
  disabled,
  loading,
  connectionStatus,
}: {
  item: WidgetItemData;
  isSelected?: boolean;
  onSelect: () => void;
  disabled: boolean;
  loading: boolean;
  connectionStatus: WidgetConnectionStatus;
}) => {
  return (
    <SelectableCard
      selected={isSelected}
      disabled={disabled}
      loading={loading}
      onClick={onSelect}
      aria-label={item.name}
      icon={
        <ThemeIcon size={34} radius="md" variant="light" color="primaryColor">
          <item.icon size={20} />
        </ThemeIcon>
      }
      title={item.name}
      topRight={!isSelected ? <ConnectionStatusBadge status={connectionStatus} /> : null}
      description={item.description}
      footerLeft={<SupportedIntegrations integrations={item.supportedIntegrations} />}
    />
  );
};

const ConnectionStatusBadge = ({ status }: { status: WidgetConnectionStatus }) => {
  if (status === "noConnectionRequired") return null;
  const t = useI18n();
  const color = status === "ready" ? "green" : status === "needsSetup" ? "yellow" : "gray";

  return (
    <Badge variant="dot" color={color} size="xs" tt="none" w="fit-content" maw="100%">
      {t(`item.create.connectionStatus.${status}`)}
    </Badge>
  );
};

const SupportedIntegrations = ({ integrations }: { integrations: IntegrationKind[] }) => {
  if (integrations.length === 0) {
    return (
      <Text size="xs" c="dimmed" fs="italic">
        Standalone
      </Text>
    );
  }

  const countToShow = integrations.length >= 6 ? 4 : 5;
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
                <Stack gap={2}>
                  {integrations.slice(countToShow).map((integration) => (
                    <Text key={integration} size="xs">
                      {getIntegrationName(integration)}
                    </Text>
                  ))}
                </Stack>
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

  const { mutate: autoCreateMock } = clientApi.integration.create.useMutation({
    onSuccess: () => {
      void utils.integration.all.invalidate();
    },
  });

  const attemptedMockRef = useRef(false);
  useEffect(() => {
    if (integrationData && canCreateIntegration && !attemptedMockRef.current) {
      const hasMock = integrationData.some((i) => i.kind === "mock");
      if (!hasMock) {
        attemptedMockRef.current = true;
        autoCreateMock({
          name: "Demo Service",
          url: "https://demo.homarr.dev",
          kind: "mock",
          secrets: [],
          attemptSearchEngineCreation: false,
        });
      }
    }
  }, [integrationData, canCreateIntegration, autoCreateMock]);

  return (
    <ItemSelectModalContent
      actions={actions}
      integrationData={integrationData}
      customWidgetDefs={customWidgetDefs}
      ensureIntegrationDataAsync={() => utils.integration.all.ensureData()}
      isAdmin={isAdmin}
      canCreateIntegration={canCreateIntegration}
      initialWidgetKind={innerProps.initialWidgetKind}
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
  size: "xxl",
});
