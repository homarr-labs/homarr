"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Center, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconPuzzle } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar, SelectGridLayout, selectGridCardHeight } from "@homarr/ui";

import { buildSortedIntegrations, categoryTranslationKeys, filterIntegrations } from "./integration-grid-shared";

interface IntegrationSelectGridProps {
  onSelect: (kind: IntegrationKind) => void;
  enableMockIntegration?: boolean;
}

export const IntegrationSelectGrid = ({ onSelect, enableMockIntegration = false }: IntegrationSelectGridProps) => {
  const [search, setSearch] = useState("");
  const t = useI18n();

  const integrations = useMemo(() => buildSortedIntegrations({ enableMockIntegration }), [enableMockIntegration]);
  const filtered = useMemo(() => filterIntegrations(integrations, search), [integrations, search]);

  return (
    <SelectGridLayout
      search={search}
      onSearchChange={setSearch}
      placeholder={`${t("integration.page.list.search")}...`}
    >
      {filtered.map((integration) => (
        <Card
          key={integration.kind}
          h={selectGridCardHeight}
          style={{ cursor: "pointer" }}
          onClick={() => onSelect(integration.kind)}
          withBorder
        >
          <Stack justify="space-between" h="100%" gap="xs">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <IntegrationAvatar kind={integration.kind} size="sm" />
              <Text fw={500} lh={1.2} size="sm" lineClamp={2}>
                {integration.name}
              </Text>
            </Group>

            <Stack gap={4} mt="auto">
              <Group gap={4} wrap="wrap">
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
      ))}

      {filtered.length === 0 && (
        <Center p="xl">
          <Text c="dimmed">{t("common.noResults")}</Text>
        </Center>
      )}
    </SelectGridLayout>
  );
};
