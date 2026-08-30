"use client";

import { useMemo, useState } from "react";
import { Badge, Center, Group, Input, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { getWidgetName } from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { IntegrationAvatar } from "../components/integration-avatar";
import { SelectableCard } from "../components/selectable-card";
import { selectGridCols } from "../select-grid-layout";
import { widgetCatalogIcons } from "../widget-icons";
import { buildSortedIntegrations, filterIntegrations } from "./integration-grid-shared";
import type { IntegrationGridItem } from "./integration-grid-shared";

export interface IntegrationSelectGridProps {
  onSelect: (kind: IntegrationKind) => void;
  enableMockIntegration?: boolean;
  allowedKinds?: readonly IntegrationKind[];
  integrationData?: { kind: IntegrationKind; name?: string }[];
}

export const IntegrationSelectGrid = ({
  onSelect,
  enableMockIntegration = false,
  allowedKinds,
  integrationData,
}: IntegrationSelectGridProps) => {
  const [search, setSearch] = useState("");
  const t = useI18n();
  const integrations = useMemo(
    () => buildSortedIntegrations({ enableMockIntegration, allowedKinds }),
    [allowedKinds, enableMockIntegration],
  );
  const filtered = useMemo(() => filterIntegrations(integrations, search), [integrations, search]);

  return (
    <Stack gap="md">
      {/* Top Search Input */}
      <Input
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        placeholder={`${t("integration.page.list.search")}...`}
        aria-label={t("integration.page.list.search")}
        data-autofocus
        onKeyDown={(event) => {
          if (event.key === "Enter" && filtered.length === 1 && filtered[0]) {
            onSelect(filtered[0].kind);
          }
        }}
      />

      {/* Scrollable Container with Integration Cards */}
      <ScrollArea.Autosize mah="70vh" offsetScrollbars>
        <Stack gap="md" pt="xs" pr="xs" px={4}>
          <SimpleGrid cols={selectGridCols} spacing="sm">
            {filtered.map((integration) => (
              <IntegrationCard
                key={integration.kind}
                integration={integration}
                onSelect={onSelect}
                connectedCount={(integrationData ?? []).filter((i) => i.kind === integration.kind).length}
              />
            ))}
          </SimpleGrid>

          {filtered.length === 0 && (
            <Center p="xl">
              <Text c="dimmed">{t("common.noResults")}</Text>
            </Center>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
};

// =========================================================================
// IntegrationCard: Shared Modular SelectableCard with Tied Widgets
// =========================================================================
const IntegrationCard = ({
  integration,
  onSelect,
  connectedCount = 0,
}: {
  integration: IntegrationGridItem;
  onSelect: (kind: IntegrationKind) => void;
  connectedCount?: number;
}) => {
  const t = useI18n();

  return (
    <SelectableCard
      onClick={() => onSelect(integration.kind)}
      aria-label={integration.name}
      icon={<IntegrationAvatar kind={integration.kind} size="sm" />}
      title={
        <Text fw={700} size="md" style={{ whiteSpace: "nowrap" }}>
          {integration.name}
        </Text>
      }
      footerLeft={
        connectedCount > 0 ? (
          <Badge variant="light" color="teal" size="xs" radius="xs">
            {t("integration.grid.connected", { count: connectedCount })}
          </Badge>
        ) : null
      }
    >
      <Text size="10px" tt="uppercase" fw={700} c="dimmed">
        {t("integration.grid.tiedWidgets")}
      </Text>
      <IntegrationTiedWidgets widgets={integration.widgets} />
    </SelectableCard>
  );
};

const IntegrationTiedWidgets = ({ widgets, limit }: { widgets: WidgetKind[]; limit?: number }) => {
  const t = useI18n();
  if (widgets.length === 0) {
    return (
      <Text size="xs" c="dimmed" fs="italic">
        {t("integration.grid.noWidgets")}
      </Text>
    );
  }

  const items = limit ? widgets.slice(0, limit) : widgets;
  const moreCount = limit ? widgets.length - limit : 0;

  return (
    <Group gap={4} wrap="wrap">
      {items.map((widgetKind) => {
        const WidgetIcon = widgetCatalogIcons[widgetKind];
        return (
          <Badge
            key={widgetKind}
            variant="default"
            radius="xs"
            size="xs"
            leftSection={<WidgetIcon size={12} />}
            style={{ fontWeight: 500 }}
          >
            {getWidgetName(widgetKind, t)}
          </Badge>
        );
      })}
      {moreCount > 0 && (
        <Badge variant="subtle" color="gray" size="xs" radius="xs">
          {t("integration.grid.more", { count: moreCount })}
        </Badge>
      )}
    </Group>
  );
};
