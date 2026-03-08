import { useMemo, useState } from "react";
import { Avatar, Button, Card, Center, Grid, Group, Input, Stack, Text, Tooltip } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { getIconUrl, getIntegrationName } from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { widgetImports } from "@homarr/widgets";

import { useItemActions } from "./item-actions";

export const ItemSelectModal = createModal<void>(({ actions }) => {
  const [search, setSearch] = useState("");
  const t = useI18n();
  const { createItem } = useItemActions();

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
    createItem({ kind });
    actions.closeModal();
  };

  return (
    <Stack>
      <Input
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        leftSection={<IconSearch />}
        placeholder={`${t("item.create.search")}...`}
        data-autofocus
        onKeyDown={(event) => {
          // Add item if there is only one item in the list and user presses Enter
          if (event.key === "Enter" && filteredItems.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            handleAdd(filteredItems[0]!.kind);
          }
        }}
      />

      <Grid>
        {filteredItems.map((item) => (
          <WidgetItem key={item.kind} item={item} onSelect={() => handleAdd(item.kind)} />
        ))}
      </Grid>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("item.create.title"),
  size: "xl",
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
    <Grid.Col span={{ xs: 12, sm: 4, md: 3 }}>
      <Card h="100%">
        <Stack justify="space-between" h="100%">
          <Stack gap="xs">
            <Center>
              <item.icon />
            </Center>
            <Text lh={1.2} style={{ whiteSpace: "normal" }} ta="center">
              {item.name}
            </Text>
            <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" ta="center" c="dimmed">
              {item.description}
            </Text>
          </Stack>
          <SupportedIntegrations mt="auto" integrations={item.supportedIntegrations} />
          <Button onClick={onSelect} variant="light" size="xs" radius="md" fullWidth>
            {t(`item.create.addToBoard`)}
          </Button>
        </Stack>
      </Card>
    </Grid.Col>
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

  // When there are 8 or more integrations, we show 6 and a "+X" avatar. Otherwise, we show all integrations.
  const countToShow = integrations.length >= 8 ? 6 : 7;
  const moreCount = integrations.length - countToShow;

  return (
    <Center mt={mt}>
      <Tooltip.Group openDelay={300} closeDelay={100}>
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
