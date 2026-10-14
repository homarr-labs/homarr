import { useMemo, useState } from "react";
import { Avatar, Badge, Center, Group, Paper, ScrollArea, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl, getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/standalone/client";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";
import { buildSortedIntegrations, filterIntegrations } from "@homarr/ui/integration-select-grid";

import type { IntegrationListItem } from "./client";
import classes from "./integrations.module.css";

export function IntegrationCatalog({
  onSelect,
  allowedKinds,
  integrations = [],
  enableMockIntegration = false,
}: {
  onSelect: (kind: IntegrationKind) => void;
  allowedKinds?: readonly IntegrationKind[];
  integrations?: readonly IntegrationListItem[];
  enableMockIntegration?: boolean;
}) {
  const t = useI18n();
  const [search, setSearch] = useState("");
  const catalog = useMemo(
    () => buildSortedIntegrations({ enableMockIntegration, allowedKinds }),
    [enableMockIntegration, allowedKinds],
  );
  const filtered = filterIntegrations(catalog, search);

  return (
    <Stack gap="md">
      <TextInput
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        placeholder={`${t("integration.page.list.search")}...`}
        aria-label={t("integration.page.list.search")}
        data-autofocus
        onKeyDown={(event) => {
          if (event.key === "Enter" && filtered.length === 1 && filtered[0]) onSelect(filtered[0].kind);
        }}
      />
      <ScrollArea.Autosize mah="70vh" offsetScrollbars>
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5 }} spacing="sm" p={4}>
          {filtered.map((item) => {
            const connected = integrations.filter((integration) => integration.kind === item.kind).length;
            return (
              <Paper
                component="button"
                type="button"
                withBorder
                p="sm"
                radius="md"
                key={item.kind}
                className={classes.catalogItem}
                onClick={() => onSelect(item.kind)}
                aria-label={item.name}
              >
                <Stack gap="sm" flex={1}>
                  <Group wrap="nowrap" className={classes.catalogHeader}>
                    <Avatar src={getIconUrl(item.kind)} size="sm" radius="sm" />
                    <Text fw={700}>{item.name}</Text>
                  </Group>
                  <Stack gap={4} flex={1}>
                    <Text size="xs" fw={700} c="dimmed">
                      {t("integration.grid.tiedWidgets")}
                    </Text>
                    {item.widgets.length === 0 ? (
                      <Text size="xs" c="dimmed" fs="italic">
                        {t("integration.grid.noWidgets")}
                      </Text>
                    ) : (
                      <Group gap={4}>
                        {item.widgets.map((widget) => {
                          const Icon = widgetCatalogIcons[widget];
                          return (
                            <Badge
                              key={widget}
                              variant="default"
                              radius="xs"
                              size="xs"
                              leftSection={<Icon size={12} />}
                            >
                              {getWidgetName(widget, t)}
                            </Badge>
                          );
                        })}
                      </Group>
                    )}
                  </Stack>
                  {connected > 0 && (
                    <Badge variant="light" color="teal" size="xs" radius="xs" className={classes.catalogFooter}>
                      {t("integration.grid.connected", { count: connected })}
                    </Badge>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
        {filtered.length === 0 && (
          <Center p="xl">
            <Text c="dimmed">{t("common.noResults")}</Text>
          </Center>
        )}
      </ScrollArea.Autosize>
    </Stack>
  );
}
