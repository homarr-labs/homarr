"use client";

import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Card,
  Collapse,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { IconBrandDocker, IconCheck, IconChevronDown } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";

export interface DiscoveredIntegration {
  containerId: string;
  containerName: string;
  kind: IntegrationKind;
  suggestedUrl: string;
  publishedPort: number | null;
  iconUrl: string | null;
}

export interface DiscoveredApp {
  containerId: string;
  containerName: string;
  suggestedUrl: string;
  publishedPort: number | null;
  iconUrl: string | null;
}

interface DockerDiscoveryIndicatorProps {
  integrations: DiscoveredIntegration[];
  apps: DiscoveredApp[];
  selectedAppIds: Set<string>;
  onToggleApp: (containerId: string) => void;
  isLoading: boolean;
}

const APP_CARD_HEIGHT = 80;

export const DockerDiscoveryIndicator = ({
  integrations,
  apps,
  selectedAppIds,
  onToggleApp,
  isLoading,
}: DockerDiscoveryIndicatorProps) => {
  const hasApps = apps.length > 0;
  const [expanded, setExpanded] = useState(false);

  const expandedOnce = useRef(false);
  useEffect(() => {
    if ((hasApps || integrations.length > 0) && !expandedOnce.current) {
      expandedOnce.current = true;
      setExpanded(true);
    }
  }, [hasApps, integrations.length]);

  const t = useScopedI18n("init.step.integrations.docker");
  const totalCount = integrations.length + apps.length;

  if (!isLoading && totalCount === 0) return null;

  const selectedAppCount = apps.filter((app) => selectedAppIds.has(app.containerId)).length;

  if (isLoading) {
    return (
      <Paper
        withBorder
        p="sm"
        radius="md"
        style={{
          borderColor: "var(--mantine-color-blue-4)",
          background: "var(--mantine-color-blue-light)",
        }}
      >
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" color="blue" size="lg" radius="md">
            <IconBrandDocker size={20} />
          </ThemeIcon>
          <Stack gap={0} style={{ flex: 1 }}>
            <Text size="sm" fw={600}>
              {t("scanning")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("scanningDescription")}
            </Text>
          </Stack>
          <Loader size="sm" color="blue" type="dots" />
        </Group>
      </Paper>
    );
  }

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      style={{
        borderColor: "var(--mantine-color-blue-4)",
        background: "var(--mantine-color-blue-light)",
      }}
    >
      <UnstyledButton onClick={() => setExpanded((prev) => !prev)} w="100%">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon variant="light" color="blue" size="lg" radius="md">
              <IconBrandDocker size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="sm" fw={600}>
                {t("detected", { count: String(totalCount) })}
              </Text>
              <Text size="xs" c="dimmed">
                {t("detectedBreakdown", {
                  integrations: String(integrations.length),
                  apps: String(apps.length),
                })}
              </Text>
            </Stack>
          </Group>
          <IconChevronDown
            size={16}
            color="var(--mantine-color-dimmed)"
            style={{
              transform: expanded ? "rotate(180deg)" : undefined,
              transition: "transform 200ms ease",
            }}
          />
        </Group>
      </UnstyledButton>

      <Collapse expanded={expanded}>
        <Stack gap="xs" mt="sm">
          {integrations.length > 0 && (
            <Stack gap={4}>
              {integrations.map((integration) => (
                <Group key={integration.containerId} gap="xs" wrap="nowrap" py={2}>
                  <IntegrationAvatar kind={integration.kind} size="xs" />
                  <Text size="xs" fw={500} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
                    {integration.containerName}
                  </Text>
                  <Badge size="xs" variant="light" color="blue">
                    {getIntegrationName(integration.kind)}
                  </Badge>
                </Group>
              ))}
            </Stack>
          )}

          {hasApps && (
            <Stack gap="xs">
              <Text size="xs" fw={500}>
                {t("appSectionLabel", { count: String(selectedAppCount) })}
              </Text>
              <ScrollArea.Autosize mah="30vh">
                <SimpleGrid cols={{ base: 3, xs: 4, sm: 5 }} spacing="xs">
                  {apps.map((app) => {
                    const isSelected = selectedAppIds.has(app.containerId);
                    return (
                      <Card
                        key={app.containerId}
                        h={APP_CARD_HEIGHT}
                        p="xs"
                        withBorder
                        style={{
                          cursor: "pointer",
                          borderColor: isSelected ? "var(--mantine-color-blue-6)" : undefined,
                          borderWidth: isSelected ? 2 : undefined,
                          opacity: isSelected ? 1 : 0.6,
                        }}
                        onClick={() => onToggleApp(app.containerId)}
                      >
                        <Stack justify="space-between" h="100%" gap={4} align="center">
                          <Group justify="space-between" w="100%" wrap="nowrap">
                            <Text size="xs" fw={500} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
                              {app.containerName}
                            </Text>
                            {isSelected && <IconCheck size={14} color="var(--mantine-color-blue-6)" />}
                          </Group>
                          <Avatar size="sm" radius="sm" src={app.iconUrl} styles={{ image: { objectFit: "contain" } }}>
                            {app.containerName.at(0)?.toUpperCase()}
                          </Avatar>
                        </Stack>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              </ScrollArea.Autosize>
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Paper>
  );
};
