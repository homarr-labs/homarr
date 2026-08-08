import { useMemo, useRef, useState } from "react";
import { Avatar, Box, Button, Card, Center, Divider, Group, Image, Stack, Text, Tooltip } from "@mantine/core";
import { IconApi } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { createId } from "@homarr/common";
import { getIconUrl, getIntegrationName, widgetIntegrationSupport, widgetKinds } from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { SelectGridLayout, selectGridCardHeight } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";
import { widgetCatalogIcons } from "@homarr/widgets/catalog";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import { WorkshopInstallButton } from "~/components/workshop/workshop-install-button";
import { useItemActions } from "./item-actions";
import { resolveMatchingIntegrationsAsync, tryLockSelection, unlockSelection } from "./item-select-data";
import { LazyWidgetEditModal, preloadWidgetEditModal } from "./lazy-widget-edit-modal";
import classes from "./item-select-modal.module.css";

interface ItemSelectModalContentProps {
  actions: { closeModal: () => void };
  integrationData: RouterOutputs["integration"]["all"] | undefined;
  customWidgetDefs: RouterOutputs["customWidget"]["available"] | undefined;
  ensureIntegrationDataAsync: () => Promise<RouterOutputs["integration"]["all"]>;
  isAdmin: boolean;
}

const ItemSelectModalContent = ({
  actions,
  integrationData,
  customWidgetDefs,
  ensureIntegrationDataAsync,
  isAdmin,
}: ItemSelectModalContentProps) => {
  const [search, setSearch] = useState("");
  const [loadingSelection, setLoadingSelection] = useState<string | null>(null);
  const selectionLock = useRef(false);
  const t = useI18n();
  const { createItem, updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations } = useItemActions();
  const { openModal: openEditModal } = useModalAction(LazyWidgetEditModal);
  const settings = useSettings();

  const availableKinds = useMemo(() => new Set((integrationData ?? []).map((i) => i.kind)), [integrationData]);

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
            createItem({ id: itemId, kind: "customApi", integrationIds: [] });
            updateItemOptions({ itemId, newOptions: configuredOptions });
            updateItemAdvancedOptions({ itemId, newAdvancedOptions: advancedOptions });
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

      const integrationIds = matchingIntegrations.map((i) => i.id);
      const itemId = createId();
      const defaultOptions = reduceWidgetOptionsWithDefinition(definition, settings);

      createItem({ id: itemId, kind, integrationIds });
      actions.closeModal();

      openEditModal(
        {
          kind,
          definition,
          value: {
            advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
            options: defaultOptions,
            integrationIds,
          },
          onSuccessfulEdit: ({ options, integrationIds: newIntegrationIds, advancedOptions }) => {
            updateItemOptions({ itemId, newOptions: options });
            updateItemAdvancedOptions({ itemId, newAdvancedOptions: advancedOptions });
            updateItemIntegrations({ itemId, newIntegrations: newIntegrationIds });
          },
          integrationData: matchingIntegrations,
          integrationSupport: hasIntegrationSupport,
          settings,
        },
        {
          title: (titleT) => `${titleT("item.edit.title")} - ${titleT(`widget.${kind}.name`)}`,
        },
      );
    } catch (error) {
      notifyDefinitionLoadError(error);
    } finally {
      unlockSelection(selectionLock);
      setLoadingSelection(null);
    }
  };

  return (
    <SelectGridLayout
      search={search}
      onSearchChange={setSearch}
      placeholder={`${t("item.create.search")}...`}
      onSearchKeyDown={(event) => {
        if (event.key === "Enter" && loadingSelection === null && filteredItems.length === 1) {
          const [item] = filteredItems;
          if (item) void handleAdd(item.kind);
        }
      }}
    >
      {filteredItems.map((item) => (
        <WidgetItem
          key={item.kind}
          item={item}
          onSelect={() => void handleAdd(item.kind)}
          onIntent={() => {
            void loadWidgetDefinition(item.kind).catch(() => undefined);
            preloadWidgetEditModal();
          }}
          disabled={loadingSelection !== null}
          loading={loadingSelection === item.kind}
          hasMatchingIntegration={item.supportedIntegrations.some((kind) => availableKinds.has(kind))}
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
            <Card
              key={def.id}
              className={classes.card}
              h={selectGridCardHeight}
              withBorder
              pos="relative"
              style={{ overflow: "hidden" }}
              onPointerEnter={() => void loadWidgetDefinition("customApi").catch(() => undefined)}
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
              </Stack>
              <Box
                className={classes.action}
                pos="absolute"
                bottom={0}
                left={0}
                right={0}
                p="xs"
                style={{
                  background: "linear-gradient(transparent, var(--mantine-color-body) 30%)",
                }}
              >
                <Button
                  onClick={() => void handleAddCustomWidget(def)}
                  variant="light"
                  size="xs"
                  fullWidth
                  disabled={loadingSelection !== null}
                  loading={loadingSelection === `custom:${def.id}`}
                >
                  {t("item.create.addToBoard")}
                </Button>
              </Box>
            </Card>
          ))}

          <Box style={{ gridColumn: "1 / -1" }}>
            <WorkshopInstallButton fullWidth>{t("workshop.installDialog")}</WorkshopInstallButton>
          </Box>
        </>
      )}

      {filteredItems.length === 0 && (!isAdmin || filteredCustomWidgets.length === 0) && (
        <Center p="xl">
          <Text c="dimmed">{t("common.noResults")}</Text>
        </Center>
      )}
    </SelectGridLayout>
  );
};
const ItemSelectModalFrame = ({
  actions,
  innerProps,
}: {
  actions: { closeModal: () => void };
  innerProps: { boardId: string };
}) => {
  const utils = clientApi.useUtils();
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
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
    />
  );
};

export const ItemSelectModal = createModal<{ boardId: string }>((props) => (
  <ItemSelectModalFrame {...props} />
)).withOptions({
  defaultTitle: (t) => t("item.create.title"),
  size: modalSizeSelect,
});

const WidgetItem = ({
  item,
  onSelect,
  onIntent,
  disabled,
  loading,
  hasMatchingIntegration,
}: {
  item: {
    kind: WidgetKind;
    supportedIntegrations: IntegrationKind[];
    name: string;
    description: string;
    icon: TablerIcon;
  };
  onSelect: () => void;
  onIntent: () => void;
  disabled: boolean;
  loading: boolean;
  hasMatchingIntegration: boolean;
}) => {
  const t = useI18n();

  return (
    <Card
      className={classes.card}
      h={selectGridCardHeight}
      withBorder
      pos="relative"
      style={{
        overflow: "hidden",
        borderColor: hasMatchingIntegration ? "var(--mantine-color-blue-6)" : undefined,
        borderWidth: hasMatchingIntegration ? 2 : undefined,
      }}
      onFocus={onIntent}
      onPointerEnter={onIntent}
      aria-busy={loading || undefined}
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
        <SupportedIntegrations integrations={item.supportedIntegrations} />
      </Stack>
      <Box
        className={classes.action}
        pos="absolute"
        bottom={0}
        left={0}
        right={0}
        p="xs"
        style={{
          background: "linear-gradient(transparent, var(--mantine-color-body) 30%)",
        }}
      >
        <Button onClick={onSelect} variant="light" size="xs" fullWidth disabled={disabled} loading={loading}>
          {t(`item.create.addToBoard`)}
        </Button>
      </Box>
    </Card>
  );
};

const SupportedIntegrations = ({ integrations }: { integrations: IntegrationKind[] }) => {
  if (integrations.length === 0) {
    return null;
  }

  const countToShow = integrations.length >= 8 ? 6 : 7;
  const moreCount = integrations.length - countToShow;

  return (
    <Group gap={2} mt="auto">
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
