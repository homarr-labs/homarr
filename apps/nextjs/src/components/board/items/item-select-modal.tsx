import { useMemo, useState } from "react";
import { Avatar, Box, Button, Card, Center, Divider, Group, Image, Stack, Text, Tooltip } from "@mantine/core";
import { IconApi } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { createId, objectEntries } from "@homarr/common";
import { getIconUrl, getIntegrationName } from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { SelectGridLayout, selectGridCardHeight } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";
import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";
import { WidgetEditModal } from "@homarr/widgets/modals";

import { useItemActions } from "./item-actions";

export const ItemSelectModal = createModal<void>(({ actions }) => {
  const [search, setSearch] = useState("");
  const t = useI18n();
  const { createItem, updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations } = useItemActions();
  const { openModal: openEditModal } = useModalAction(WidgetEditModal);
  const { data: integrationData } = clientApi.integration.all.useQuery();
  const { data: customWidgetDefs } = clientApi.customWidget.all.useQuery();
  const settings = useSettings();

  const availableKinds = useMemo(() => new Set((integrationData ?? []).map((i) => i.kind)), [integrationData]);

  const items = useMemo(
    () =>
      objectEntries(widgetImports)
        .filter(([kind]) => kind !== "customApi")
        .map(([kind, value]) => ({
          kind,
          supportedIntegrations:
            "supportedIntegrations" in value.definition
              ? value.definition.supportedIntegrations.filter((integration) => integration !== "mock")
              : [],
          icon: value.definition.icon,
          name: t(`widget.${kind}.name`),
          description: t(`widget.${kind}.description`),
        }))
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
    () =>
      (customWidgetDefs ?? []).filter((def) => def.enabled && def.name.toLowerCase().includes(search.toLowerCase())),
    [customWidgetDefs, search],
  );

  const handleAddCustomWidget = (definitionId: string) => {
    const itemId = createId();
    const defaultOptions = reduceWidgetOptionsWithDefaultValues("customApi", settings);
    createItem({ id: itemId, kind: "customApi", integrationIds: [] });
    updateItemOptions({ itemId, newOptions: { ...defaultOptions, definitionId } });
    actions.closeModal();
  };

  const handleAdd = (kind: WidgetKind) => {
    const definition = widgetImports[kind].definition;
    const hasIntegrationSupport = "supportedIntegrations" in definition;

    const matchingIntegrations = hasIntegrationSupport
      ? (integrationData ?? []).filter((integration) =>
          (definition.supportedIntegrations as string[]).includes(integration.kind),
        )
      : [];

    const integrationIds = matchingIntegrations.map((i) => i.id);
    const itemId = createId();
    const defaultOptions = reduceWidgetOptionsWithDefaultValues(kind, settings);

    createItem({ id: itemId, kind, integrationIds });
    actions.closeModal();

    openEditModal(
      {
        kind,
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
  };

  return (
    <SelectGridLayout
      search={search}
      onSearchChange={setSearch}
      placeholder={`${t("item.create.search")}...`}
      onSearchKeyDown={(event) => {
        if (event.key === "Enter" && filteredItems.length === 1) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          handleAdd(filteredItems[0]!.kind);
        }
      }}
    >
      {filteredItems.map((item) => (
        <WidgetItem
          key={item.kind}
          item={item}
          onSelect={() => handleAdd(item.kind)}
          hasMatchingIntegration={item.supportedIntegrations.some((kind) => availableKinds.has(kind))}
        />
      ))}

      {filteredCustomWidgets.length > 0 && (
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
              h={selectGridCardHeight}
              withBorder
              pos="relative"
              style={{ overflow: "hidden", "--_hover-opacity": "0" }}
              onMouseEnter={(e) => e.currentTarget.style.setProperty("--_hover-opacity", "1")}
              onMouseLeave={(e) => e.currentTarget.style.setProperty("--_hover-opacity", "0")}
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
                  {def.description ?? def.url}
                </Text>
              </Stack>
              <Box
                pos="absolute"
                bottom={0}
                left={0}
                right={0}
                p="xs"
                style={{
                  opacity: "var(--_hover-opacity)",
                  transition: "opacity 150ms ease",
                  background: "linear-gradient(transparent, var(--mantine-color-body) 30%)",
                }}
              >
                <Button onClick={() => handleAddCustomWidget(def.id)} variant="light" size="xs" fullWidth>
                  {t("item.create.addToBoard")}
                </Button>
              </Box>
            </Card>
          ))}
        </>
      )}

      {filteredItems.length === 0 && filteredCustomWidgets.length === 0 && (
        <Center p="xl">
          <Text c="dimmed">{t("common.noResults")}</Text>
        </Center>
      )}
    </SelectGridLayout>
  );
}).withOptions({
  defaultTitle: (t) => t("item.create.title"),
  size: modalSizeSelect,
});

const WidgetItem = ({
  item,
  onSelect,
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
  hasMatchingIntegration: boolean;
}) => {
  const t = useI18n();

  return (
    <Card
      h={selectGridCardHeight}
      withBorder
      pos="relative"
      style={{
        overflow: "hidden",
        "--_hover-opacity": "0",
        borderColor: hasMatchingIntegration ? "var(--mantine-color-blue-6)" : undefined,
        borderWidth: hasMatchingIntegration ? 2 : undefined,
      }}
      onMouseEnter={(e) => e.currentTarget.style.setProperty("--_hover-opacity", "1")}
      onMouseLeave={(e) => e.currentTarget.style.setProperty("--_hover-opacity", "0")}
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
        pos="absolute"
        bottom={0}
        left={0}
        right={0}
        p="xs"
        style={{
          opacity: "var(--_hover-opacity)",
          transition: "opacity 150ms ease",
          background: "linear-gradient(transparent, var(--mantine-color-body) 30%)",
        }}
      >
        <Button onClick={onSelect} variant="light" size="xs" fullWidth>
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
