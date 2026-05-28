import { useMemo, useState } from "react";
import { Avatar, Button, Card, Center, Group, Stack, Text, Tooltip } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createId, objectEntries } from "@homarr/common";
import { getIconUrl, getIntegrationName } from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { SelectGridLayout, selectGridCardHeight, type TablerIcon } from "@homarr/ui";
import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";
import { WidgetEditModal } from "@homarr/widgets/modals";

import { useItemActions } from "./item-actions";

export const ItemSelectModal = createModal<void>(({ actions }) => {
  const [search, setSearch] = useState("");
  const t = useI18n();
  const { createItem, updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations } = useItemActions();
  const { openModal: openEditModal } = useModalAction(WidgetEditModal);
  const { data: integrationData } = clientApi.integration.all.useQuery();
  const settings = useSettings();

  const items = useMemo(
    () =>
      objectEntries(widgetImports)
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
        .sort((itemA, itemB) => itemA.name.localeCompare(itemB.name)),
    [t],
  );

  const filteredItems = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

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
        <WidgetItem key={item.kind} item={item} onSelect={() => handleAdd(item.kind)} />
      ))}

      {filteredItems.length === 0 && (
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
}: {
  item: {
    kind: WidgetKind;
    supportedIntegrations: IntegrationKind[];
    name: string;
    description: string;
    icon: TablerIcon;
  };
  onSelect: () => void;
}) => {
  const t = useI18n();

  return (
    <Card h={selectGridCardHeight} withBorder>
      <Stack justify="space-between" h="100%" gap="xs">
        <Stack gap="xs">
          <Center>
            <item.icon />
          </Center>
          <Text lh={1.2} style={{ whiteSpace: "normal" }} ta="center" lineClamp={2}>
            {item.name}
          </Text>
          <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" ta="center" c="dimmed" lineClamp={2}>
            {item.description}
          </Text>
        </Stack>
        <SupportedIntegrations mt="auto" integrations={item.supportedIntegrations} />
        <Button onClick={onSelect} variant="light" size="xs" fullWidth>
          {t(`item.create.addToBoard`)}
        </Button>
      </Stack>
    </Card>
  );
};

interface SupportedIntegrationsProps {
  integrations: IntegrationKind[];
  mt: string;
}

const SupportedIntegrations = ({ integrations, mt }: SupportedIntegrationsProps) => {
  if (integrations.length === 0) {
    return null;
  }

  const countToShow = integrations.length >= 8 ? 6 : 7;
  const moreCount = integrations.length - countToShow;

  return (
    <Center mt={mt}>
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
    </Center>
  );
};
