import type { MantineColor } from "@mantine/core";
import { ActionIcon, Divider, Group, Indicator, Popover, RingProgress, Stack, Text } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { IconHeartbeat } from "@tabler/icons-react";

import type { TdarrStatistics } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import actionTargetClasses from "../common/action-target.module.css";

interface HealthCheckStatusProps {
  statistics: TdarrStatistics;
}

export function HealthCheckStatus(props: HealthCheckStatusProps) {
  const colorScheme = useColorScheme();
  const t = useI18n("widget.mediaTranscoding.healthCheck");

  const indicatorColor = props.statistics.failedHealthCheckCount
    ? "red"
    : props.statistics.stagedHealthCheckCount
      ? "yellow"
      : "green";

  return (
    <Popover position="bottom" width={250} shadow="sm" withArrow>
      <Popover.Target>
        <ActionIcon className={actionTargetClasses.root} variant="subtle" size="sm" aria-label={t("title")}>
          <Indicator color={textColor(indicatorColor, colorScheme)} size={6} display="flex">
            <IconHeartbeat style={iconSizes.md} />
          </Indicator>
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-8))",
        }}
      >
        <Stack gap="sm" align="center">
          <Group gap="xs">
            <IconHeartbeat style={iconSizes.lg} />
            <Text size="sm">{t("title")}</Text>
          </Group>
          <Divider
            style={{
              alignSelf: "stretch",
            }}
          />
          <RingProgress
            sections={[
              { value: props.statistics.stagedHealthCheckCount, color: textColor("yellow", colorScheme) },
              { value: props.statistics.totalHealthCheckCount, color: textColor("green", colorScheme) },
              { value: props.statistics.failedHealthCheckCount, color: textColor("red", colorScheme) },
            ]}
          />
          <Group display="flex" w="100%">
            <Stack style={{ flex: 1 }} gap={0} align="center">
              <Text size="xs" c={textColor("yellow", colorScheme)}>
                {props.statistics.stagedHealthCheckCount}
              </Text>
              <Text size="xs">{t("queued")}</Text>
            </Stack>
            <Stack style={{ flex: 1 }} gap={0} align="center">
              <Text size="xs" c={textColor("green", colorScheme)}>
                {props.statistics.totalHealthCheckCount}
              </Text>
              <Text size="xs">{t("status.healthy")}</Text>
            </Stack>
            <Stack style={{ flex: 1 }} gap={0} align="center">
              <Text size="xs" c={textColor("red", colorScheme)}>
                {props.statistics.failedHealthCheckCount}
              </Text>
              <Text size="xs">{t("status.unhealthy")}</Text>
            </Stack>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function textColor(color: MantineColor, theme: "light" | "dark") {
  return `${color}.${theme === "light" ? 8 : 5}`;
}
