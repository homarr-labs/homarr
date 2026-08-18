"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Center, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconPuzzle } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { IntegrationAvatar } from "../components/integration-avatar";
import { SelectGridLayout, selectGridCardHeight } from "../select-grid-layout";
import { buildSortedIntegrations, categoryTranslationKeys, filterIntegrations } from "./integration-grid-shared";
import classes from "./integration-select-grid.module.css";

export interface IntegrationSelectGridProps {
  onSelect: (kind: IntegrationKind) => void;
  enableMockIntegration?: boolean;
  allowedKinds?: readonly IntegrationKind[];
}

export const IntegrationSelectGrid = ({
  onSelect,
  enableMockIntegration = false,
  allowedKinds,
}: IntegrationSelectGridProps) => {
  const [search, setSearch] = useState("");
  const t = useI18n();
  const integrations = useMemo(
    () => buildSortedIntegrations({ enableMockIntegration, allowedKinds }),
    [allowedKinds, enableMockIntegration],
  );
  const filtered = useMemo(() => filterIntegrations(integrations, search), [integrations, search]);

  return (
    <SelectGridLayout
      search={search}
      onSearchChange={setSearch}
      placeholder={`${t("integration.page.list.search")}...`}
      ariaLabel={t("integration.page.list.search")}
    >
      {filtered.map((integration) => (
        <UnstyledButton
          className={classes.choice}
          key={integration.kind}
          onClick={() => onSelect(integration.kind)}
          aria-label={integration.name}
        >
          <Card h={selectGridCardHeight} className={classes.card} withBorder>
            <Stack justify="space-between" h="100%" gap="xs">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <IntegrationAvatar kind={integration.kind} size="sm" />
                <Text fw={500} lh={1.2} size="sm" lineClamp={2}>
                  {integration.name}
                </Text>
              </Group>
              <IntegrationGridMeta integration={integration} />
            </Stack>
          </Card>
        </UnstyledButton>
      ))}
      {filtered.length === 0 && (
        <Center p="xl" style={{ gridColumn: "1 / -1" }}>
          <Text c="dimmed">{t("common.noResults")}</Text>
        </Center>
      )}
    </SelectGridLayout>
  );
};

const IntegrationGridMeta = ({ integration }: { integration: ReturnType<typeof buildSortedIntegrations>[number] }) => {
  const t = useI18n();
  return (
    <Stack gap={4} mt="auto">
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
  );
};
