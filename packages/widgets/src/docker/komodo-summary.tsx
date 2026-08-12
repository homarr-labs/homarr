"use client";

import { Center, Group, Loader, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconRocket, IconServer, IconStack2 } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { KomodoResourceSummary } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { getKomodoRefreshIntervalMs } from "./komodo-refresh-interval";

const getSummaryColor = (summary: KomodoResourceSummary) => {
  if (summary.error > 0) return "red";
  if (summary.unknown > 0) return "gray";
  if (summary.warning > 0) return "yellow";
  return "green";
};

interface KomodoSummaryProps {
  integrationId: string;
  options: WidgetComponentProps<"dockerContainers">["options"];
  width: number;
}

export const KomodoSummary = ({ integrationId, options, width }: KomodoSummaryProps) => {
  const t = useScopedI18n("widget.dockerContainers.komodo");
  const { data, error, isPending } = clientApi.widget.komodo.getOverview.useQuery(
    { integrationId },
    { refetchInterval: getKomodoRefreshIntervalMs(options.refreshInterval) },
  );

  if (error) throw error;

  if (isPending) {
    return (
      <Center h={42} style={{ borderBottom: "0.0625rem solid var(--border-color)" }}>
        <Loader size="xs" />
      </Center>
    );
  }

  if (!data) return null;

  const { overview } = data;
  const visibleProblemCount =
    (options.showServers ? overview.servers.total - overview.servers.healthy : 0) +
    (options.showStacks ? overview.stacks.total - overview.stacks.healthy : 0) +
    (options.showDeployments ? overview.deployments.total - overview.deployments.healthy : 0);
  const summaries: SummaryItemProps[] = [];

  if (options.showServers) {
    summaries.push({
      icon: IconServer,
      label: t("resource.servers"),
      value: `${overview.servers.healthy} / ${overview.servers.total}`,
      color: getSummaryColor(overview.servers),
    });
  }
  if (options.showStacks) {
    summaries.push({
      icon: IconStack2,
      label: t("resource.stacks"),
      value: `${overview.stacks.healthy} / ${overview.stacks.total}`,
      color: getSummaryColor(overview.stacks),
    });
  }
  if (options.showDeployments) {
    summaries.push({
      icon: IconRocket,
      label: t("resource.deployments"),
      value: `${overview.deployments.healthy} / ${overview.deployments.total}`,
      color: getSummaryColor(overview.deployments),
    });
  }
  if (options.showProblems) {
    summaries.push({
      icon: IconAlertTriangle,
      label: t("problems"),
      value: visibleProblemCount.toString(),
      color: visibleProblemCount > 0 ? "red" : "green",
    });
  }

  if (summaries.length === 0) return null;

  const maximumColumns = width >= 720 ? 4 : width >= 400 ? 2 : 1;

  return (
    <SimpleGrid
      cols={Math.min(maximumColumns, summaries.length)}
      spacing={4}
      verticalSpacing={4}
      px="xs"
      py={6}
      style={{ borderBottom: "0.0625rem solid var(--border-color)", flexShrink: 0 }}
    >
      {summaries.map((summary) => (
        <SummaryItem key={summary.label} {...summary} />
      ))}
    </SimpleGrid>
  );
};

interface SummaryItemProps {
  icon: TablerIcon;
  label: string;
  value: string;
  color: string;
}

const SummaryItem = ({ icon: Icon, label, value, color }: SummaryItemProps) => (
  <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
    <ThemeIcon color={color} variant="light" size={26} radius="sm" style={{ flexShrink: 0 }}>
      <Icon size={15} />
    </ThemeIcon>
    <Stack gap={0} style={{ minWidth: 0 }}>
      <Text size="10px" c="dimmed" truncate lh={1.1}>
        {label}
      </Text>
      <Text size="sm" fw={700} truncate lh={1.2}>
        {value}
      </Text>
    </Stack>
  </Group>
);
