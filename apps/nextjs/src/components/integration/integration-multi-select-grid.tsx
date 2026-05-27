"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Card, Center, Group, Input, ScrollArea, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconPuzzle, IconSearch } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";

import {
  buildSortedIntegrations,
  CARD_HEIGHT,
  categoryTranslationKeys,
  filterIntegrations,
} from "./integration-grid-shared";

interface IntegrationMultiSelectGridProps {
  selectedKinds: IntegrationKind[];
  onSelectionChange: (kinds: IntegrationKind[]) => void;
  enableMockIntegration?: boolean;
  onboarding?: boolean;
}

export const IntegrationMultiSelectGrid = ({
  selectedKinds: selectedKindsArray,
  onSelectionChange,
  enableMockIntegration = false,
  onboarding = false,
}: IntegrationMultiSelectGridProps) => {
  const [search, setSearch] = useState("");
  const selectedKinds = useMemo(() => new Set(selectedKindsArray), [selectedKindsArray]);
  const t = useI18n();

  const toggleKind = useCallback(
    (kind: IntegrationKind) => {
      const next = new Set(selectedKinds);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      onSelectionChange(Array.from(next));
    },
    [selectedKinds, onSelectionChange],
  );

  const integrations = useMemo(() => buildSortedIntegrations({ enableMockIntegration, onboarding }), [enableMockIntegration, onboarding]);
  const filtered = useMemo(() => filterIntegrations(integrations, search), [integrations, search]);

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
                          {categoryTranslationKeys[cat] ? t(categoryTranslationKeys[cat] as never) : cat}
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
                          {t("integration.grid.widgetCount", { count: String(integration.widgets.length) })}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge variant="light" color="gray" size="sm">
                        {t("integration.grid.noWidgets")}
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
