"use client";

import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Checkbox,
  Collapse,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconBrandDocker } from "@tabler/icons-react";

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
  iconUrl: string | null;
}

interface DockerDiscoveryIndicatorProps {
  integrations: DiscoveredIntegration[];
  apps: DiscoveredApp[];
  appsEnabled: boolean;
  onToggleAllApps: (checked: boolean) => void;
}

export const DockerDiscoveryIndicator = ({
  integrations,
  apps,
  appsEnabled,
  onToggleAllApps,
}: DockerDiscoveryIndicatorProps) => {
  const hasApps = apps.length > 0;
  const [expanded, setExpanded] = useState(false);

  const expandedOnce = useRef(false);
  useEffect(() => {
    if (hasApps && !expandedOnce.current) {
      expandedOnce.current = true;
      setExpanded(true);
    }
  }, [hasApps]);
  const t = useScopedI18n("init.step.integrations.docker");
  const totalCount = integrations.length + apps.length;

  if (totalCount === 0) return null;

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
      <UnstyledButton onClick={() => setExpanded((v) => !v)} w="100%">
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

      <Collapse in={expanded}>
        <Stack gap={4} mt="sm">
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

          {hasApps && (
            <>
              {integrations.length > 0 && <Divider my={4} />}
              <Checkbox
                size="xs"
                label={t("appSectionLabel", { count: String(apps.length) })}
                checked={appsEnabled}
                onChange={() => onToggleAllApps(!appsEnabled)}
                styles={{ label: { fontSize: "var(--mantine-font-size-xs)" } }}
              />
              {appsEnabled && apps.map((app) => (
                <Group key={app.containerId} gap="xs" wrap="nowrap" py={2}>
                  <Avatar
                    size="xs"
                    radius="sm"
                    src={app.iconUrl}
                    styles={{ image: { objectFit: "contain" } }}
                  >
                    {app.containerName.at(0)?.toUpperCase()}
                  </Avatar>
                  <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
                    {app.containerName}
                  </Text>
                </Group>
              ))}
            </>
          )}
        </Stack>
      </Collapse>
    </Paper>
  );
};
