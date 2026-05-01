"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Card, Center, Group, Input, ScrollArea, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconPuzzle, IconSearch } from "@tabler/icons-react";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { featuredIntegrations, getIntegrationName, integrationDefs, integrationKinds } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";
import { widgetImports } from "@homarr/widgets";

interface IntegrationMultiSelectGridProps {
  onSelectionChange: (kinds: IntegrationKind[]) => void;
  enableMockIntegration?: boolean;
}

const getWidgetsByIntegration = () => {
  const map: Record<IntegrationKind, WidgetKind[]> = Object.fromEntries(
    integrationKinds.map((kind) => [kind, []]),
  ) as Record<IntegrationKind, WidgetKind[]>;

  for (const [widgetKind, widget] of Object.entries(widgetImports) as [
    WidgetKind,
    (typeof widgetImports)[WidgetKind],
  ][]) {
    const supported =
      "supportedIntegrations" in widget.definition ? (widget.definition.supportedIntegrations as string[]) : [];
    for (const kind of supported) {
      if (kind in map) {
        map[kind as IntegrationKind].push(widgetKind);
      }
    }
  }
  return map;
};

const widgetsByIntegration = getWidgetsByIntegration();

const categoryLabels: Record<string, string> = {
  dnsHole: "DNS",
  mediaService: "Media",
  calendar: "Calendar",
  mediaSearch: "Search",
  mediaRelease: "Releases",
  mediaRequest: "Requests",
  downloadClient: "Downloads",
  usenet: "Usenet",
  torrent: "Torrent",
  miscellaneous: "Misc",
  smartHomeServer: "Smart Home",
  indexerManager: "Indexer",
  healthMonitoring: "Health",
  search: "Search",
  mediaTranscoding: "Transcoding",
  networkController: "Network",
  releasesProvider: "Releases",
  notifications: "Notifications",
  firewall: "Firewall",
  timetable: "Timetable",
  photoService: "Photos",
  notes: "Notes",
  mediaMonitoring: "Monitoring",
  speedtest: "Speed Test",
};

const CARD_HEIGHT = 180;

export const IntegrationMultiSelectGrid = ({
  onSelectionChange,
  enableMockIntegration = false,
}: IntegrationMultiSelectGridProps) => {
  const [search, setSearch] = useState("");
  const [selectedKinds, setSelectedKinds] = useState<Set<IntegrationKind>>(new Set());
  const t = useI18n();

  useEffect(() => {
    onSelectionChange(Array.from(selectedKinds));
  }, [selectedKinds, onSelectionChange]);

  const toggleKind = useCallback((kind: IntegrationKind) => {
    setSelectedKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  }, []);

  const integrations = useMemo(() => {
    return integrationKinds
      .filter((kind) => enableMockIntegration || kind !== "mock")
      .map((kind) => ({
        kind,
        name: getIntegrationName(kind),
        categories: [...new Set(integrationDefs[kind].category.flat())] as string[],
        widgets: widgetsByIntegration[kind],
      }))
      .sort((left, right) => {
        const leftIdx = featuredIntegrations.indexOf(left.kind);
        const rightIdx = featuredIntegrations.indexOf(right.kind);
        if (leftIdx !== -1 && rightIdx !== -1) return leftIdx - rightIdx;
        if (leftIdx !== -1) return -1;
        if (rightIdx !== -1) return 1;
        return right.widgets.length - left.widgets.length || left.name.localeCompare(right.name);
      });
  }, [enableMockIntegration]);

  const filtered = useMemo(
    () => integrations.filter((i) => i.name.toLowerCase().includes(search.toLowerCase().trim())),
    [integrations, search],
  );

  return (
    <Stack>
      <Input
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        leftSection={<IconSearch />}
        placeholder={`${t("integration.page.list.search")}...`}
        data-autofocus
      />

      <ScrollArea.Autosize mah="60vh">
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }} spacing="sm">
          {filtered.map((integration) => {
            const isSelected = selectedKinds.has(integration.kind);
            return (
              <Card
                key={integration.kind}
                h={CARD_HEIGHT}
                style={{
                  cursor: "pointer",
                  borderColor: isSelected ? "var(--mantine-color-blue-6)" : undefined,
                  borderWidth: isSelected ? 2 : undefined,
                }}
                onClick={() => toggleKind(integration.kind)}
                withBorder
              >
                <Stack justify="space-between" h="100%" gap="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={500} lh={1.2} size="sm" lineClamp={1} style={{ flex: 1 }}>
                      {integration.name}
                    </Text>
                    {isSelected && <IconCheck size={18} color="var(--mantine-color-blue-6)" />}
                  </Group>

                  <Center>
                    <IntegrationAvatar kind={integration.kind} size="lg" />
                  </Center>

                  <Stack gap={4} align="center">
                    <Group gap={4} justify="center" wrap="wrap">
                      {integration.categories.slice(0, 2).map((cat) => (
                        <Badge key={cat} variant="light" size="xs">
                          {categoryLabels[cat] ?? cat}
                        </Badge>
                      ))}
                    </Group>
                    {integration.widgets.length > 0 ? (
                      <Tooltip
                        multiline
                        w={200}
                        label={
                          <Stack gap={4}>
                            {integration.widgets.map((widgetKind) => (
                              <Text key={widgetKind} size="xs">
                                {t(`widget.${widgetKind}.name`)}
                              </Text>
                            ))}
                          </Stack>
                        }
                      >
                        <Badge variant="light" color="blue" size="sm" leftSection={<IconPuzzle size={12} />}>
                          {integration.widgets.length} {integration.widgets.length === 1 ? "widget" : "widgets"}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge variant="light" color="gray" size="sm">
                        No widgets
                      </Badge>
                    )}
                  </Stack>
                </Stack>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <Center p="xl">
              <Text c="dimmed">{t("common.noResults")}</Text>
            </Center>
          )}
        </SimpleGrid>
      </ScrollArea.Autosize>
    </Stack>
  );
};
