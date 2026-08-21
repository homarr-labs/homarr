"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Card, Center, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBrandDocker, IconCheck, IconPuzzle } from "@tabler/icons-react";

import { getWidgetName } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { IntegrationAvatar } from "../components/integration-avatar";
import { SelectGridLayout, selectGridCardHeight } from "../select-grid-layout";
import { buildSortedIntegrations, categoryTranslationKeys, filterIntegrations } from "./integration-grid-shared";
import classes from "./integration-select-grid.module.css";

export interface IntegrationMultiSelectGridProps {
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
      if (current.has(kind)) current.delete(kind);
      else current.add(kind);
      onSelectionChange(Array.from(current));
    },
    [onSelectionChange, selectedKindsArray],
  );
  const integrations = useMemo(
    () => buildSortedIntegrations({ enableMockIntegration, onboarding }),
    [enableMockIntegration, onboarding],
  );
  const sorted = useMemo(() => {
    if (!detectedKinds || detectedKinds.size === 0) return integrations;
    return [
      ...integrations.filter((integration) => detectedKinds.has(integration.kind)),
      ...integrations.filter((integration) => !detectedKinds.has(integration.kind)),
    ];
  }, [detectedKinds, integrations]);
  const filtered = useMemo(() => filterIntegrations(sorted, search), [search, sorted]);

  return (
    <SelectGridLayout
      search={search}
      onSearchChange={setSearch}
      placeholder={`${t("integration.page.list.search")}...`}
      ariaLabel={t("integration.page.list.search")}
      disableAutoFocus={onboarding}
    >
      {filtered.map((integration) => {
        const isSelected = selectedKinds.has(integration.kind);
        const isDetected = detectedKinds?.has(integration.kind) ?? false;
        return (
          <UnstyledButton
            className={classes.choice}
            key={integration.kind}
            onClick={() => toggleKind(integration.kind)}
            aria-label={integration.name}
            aria-pressed={isSelected}
          >
            <Card
              h={selectGridCardHeight}
              className={classes.card}
              style={{
                borderColor: isSelected ? "var(--mantine-primary-color-filled)" : undefined,
                borderWidth: isSelected ? 2 : undefined,
              }}
              withBorder
            >
              <Stack justify="space-between" h="100%" gap="xs">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <IntegrationAvatar kind={integration.kind} size="sm" />
                  <Text fw={500} lh={1.2} size="sm" lineClamp={2} style={{ flex: 1 }}>
                    {integration.name}
                  </Text>
                  {isSelected && <IconCheck size={18} color="var(--mantine-primary-color-filled)" />}
                </Group>
                <Stack gap={4} mt="auto">
                  {isDetected && (
                    <Badge variant="light" color="teal" size="xs" leftSection={<IconBrandDocker size={12} />}>
                      {t("integration.grid.detected")}
                    </Badge>
                  )}
                  <Group gap={4} wrap="wrap">
                    {integration.categories.slice(0, 2).map((category) => (
                      <Badge key={category} variant="light" size="xs">
                        {categoryTranslationKeys[category] ? t(categoryTranslationKeys[category] as never) : category}
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
                              {getWidgetName(widgetKind, t)}
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
          </UnstyledButton>
        );
      })}
      {filtered.length === 0 && (
        <Center p="xl" style={{ gridColumn: "1 / -1" }}>
          <Text c="dimmed">{t("common.noResults")}</Text>
        </Center>
      )}
    </SelectGridLayout>
  );
};
