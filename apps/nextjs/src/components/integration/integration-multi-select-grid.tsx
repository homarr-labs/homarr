"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Card, Center, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconBrandDocker, IconCheck, IconPuzzle } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar, SelectGridLayout, selectGridCardHeight } from "@homarr/ui";

import { buildSortedIntegrations, categoryTranslationKeys, filterIntegrations } from "./integration-grid-shared";

interface IntegrationMultiSelectGridProps {
  selectedKinds: IntegrationKind[];
  onSelectionChange: (kinds: IntegrationKind[]) => void;
  enableMockIntegration?: boolean;
  onboarding?: boolean;
  detectedKinds?: Set<IntegrationKind>;
}

export const IntegrationMultiSelectGrid = ({
  selectedKinds: selectedKindsArray,
  onSelectionChange,
  enableMockIntegration = false,
  onboarding = false,
  detectedKinds,
}: IntegrationMultiSelectGridProps) => {
  const [search, setSearch] = useState("");
  const selectedKinds = useMemo(() => new Set(selectedKindsArray), [selectedKindsArray]);
  const t = useI18n();

  const toggleKind = useCallback(
    (kind: IntegrationKind) => {
      const current = new Set(selectedKindsArray);
      if (current.has(kind)) {
        current.delete(kind);
      } else {
        current.add(kind);
      }
      onSelectionChange(Array.from(current));
    },
    [selectedKindsArray, onSelectionChange],
  );

  const integrations = useMemo(
    () => buildSortedIntegrations({ enableMockIntegration, onboarding }),
    [enableMockIntegration, onboarding],
  );

  const sorted = useMemo(() => {
    if (!detectedKinds || detectedKinds.size === 0) return integrations;
    const detected = integrations.filter((i) => detectedKinds.has(i.kind));
    const rest = integrations.filter((i) => !detectedKinds.has(i.kind));
    return [...detected, ...rest];
  }, [integrations, detectedKinds]);

  const filtered = useMemo(() => filterIntegrations(sorted, search), [sorted, search]);

  return (
    <SelectGridLayout
      search={search}
      onSearchChange={setSearch}
      placeholder={`${t("integration.page.list.search")}...`}
      disableScroll={onboarding}
      disableAutoFocus={onboarding}
    >
      {filtered.map((integration) => {
        const isSelected = selectedKinds.has(integration.kind);
        const isDetected = detectedKinds?.has(integration.kind) ?? false;
        return (
          <Card
            key={integration.kind}
            h={selectGridCardHeight}
            style={{
              cursor: "pointer",
              borderColor: isSelected ? "var(--mantine-color-blue-6)" : undefined,
              borderWidth: isSelected ? 2 : undefined,
            }}
            onClick={() => toggleKind(integration.kind)}
            withBorder
          >
            <Stack justify="space-between" h="100%" gap="xs">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <IntegrationAvatar kind={integration.kind} size="sm" />
                <Text fw={500} lh={1.2} size="sm" lineClamp={2} style={{ flex: 1 }}>
                  {integration.name}
                </Text>
                {isSelected && <IconCheck size={18} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />}
              </Group>

              <Stack gap={4} mt="auto">
                {isDetected && (
                  <Badge variant="light" color="teal" size="xs" leftSection={<IconBrandDocker size={12} />}>
                    {t("integration.grid.detected")}
                  </Badge>
                )}
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
        );
      })}

      {filtered.length === 0 && (
        <Center p="xl">
          <Text c="dimmed">{t("common.noResults")}</Text>
        </Center>
      )}
    </SelectGridLayout>
  );
};
