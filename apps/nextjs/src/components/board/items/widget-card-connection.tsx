import { Avatar, Badge, Group, Stack, Text, Tooltip } from "@mantine/core";

import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl, getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { WidgetConnectionStatus } from "./item-select-data";

export const ConnectionStatusBadge = ({ status }: { status: WidgetConnectionStatus }) => {
  const t = useI18n();
  if (status === "noConnectionRequired") return null;
  const color = status === "ready" ? "green" : status === "needsSetup" ? "yellow" : "gray";

  return (
    <Badge variant="dot" color={color} size="xs" tt="none" w="fit-content" maw="100%">
      {t(`item.create.connectionStatus.${status}`)}
    </Badge>
  );
};

export const SupportedIntegrations = ({
  integrations,
  availableKinds,
}: {
  integrations: IntegrationKind[];
  availableKinds?: ReadonlySet<IntegrationKind>;
}) => {
  const t = useI18n();

  if (integrations.length === 0) {
    return (
      <Text size="xs" c="dimmed" fs="italic">
        {t("item.create.standalone")}
      </Text>
    );
  }

  const orderedIntegrations = integrations.toSorted(
    (left, right) => Number(availableKinds?.has(right) ?? false) - Number(availableKinds?.has(left) ?? false),
  );
  const countToShow = integrations.length >= 6 ? 4 : 5;
  const moreCount = integrations.length - countToShow;
  const getLabel = (kind: IntegrationKind) => {
    const name = getIntegrationName(kind);
    if (!availableKinds || availableKinds.has(kind)) return name;
    return t("item.create.integrationNotConnected", { name });
  };

  return (
    <Group gap={2}>
      <Tooltip.Group closeDelay={100}>
        <Group gap={2}>
          {orderedIntegrations.slice(0, countToShow).map((integration) => (
            <Tooltip key={integration} label={getLabel(integration)} withArrow>
              <Avatar
                src={getIconUrl(integration)}
                alt={getLabel(integration)}
                size="xs"
                radius="xl"
                style={
                  availableKinds && !availableKinds.has(integration)
                    ? { filter: "grayscale(1)", opacity: 0.55 }
                    : undefined
                }
              />
            </Tooltip>
          ))}
          {moreCount > 0 && (
            <Tooltip
              withArrow
              label={
                <Stack gap={2}>
                  {orderedIntegrations.slice(countToShow).map((integration) => (
                    <Text key={integration} size="xs">
                      {getLabel(integration)}
                    </Text>
                  ))}
                </Stack>
              }
            >
              <Avatar radius="xl" size="xs">
                +{moreCount}
              </Avatar>
            </Tooltip>
          )}
        </Group>
      </Tooltip.Group>
    </Group>
  );
};
