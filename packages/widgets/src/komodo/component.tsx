"use client";

import { Badge, Center, Group, Loader, Paper, ScrollArea, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconRocket, IconServer, IconStack2 } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { KomodoResourceSummary } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { formatKomodoState, komodoStatusColors } from "./display";
import { getKomodoRefreshIntervalMs } from "./refresh-interval";

const getSummaryColor = (summary: KomodoResourceSummary) => {
  if (summary.error > 0) return "red";
  if (summary.unknown > 0) return "gray";
  if (summary.warning > 0) return "yellow";
  return "green";
};

export default function KomodoWidget({ integrationIds, options, width, height }: WidgetComponentProps<"komodo">) {
  const t = useScopedI18n("widget.komodo");
  const integrationId = integrationIds[0];
  const { data, error, isPending } = clientApi.widget.komodo.getOverview.useQuery(
    { integrationId: integrationId ?? "" },
    {
      enabled: integrationId !== undefined,
      refetchInterval: getKomodoRefreshIntervalMs(options.refreshInterval),
    },
  );

  if (error) throw error;
  if (!integrationId) return <WidgetEmptyState />;
  if (isPending) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }
  if (!data) return <WidgetEmptyState />;

  const { overview } = data;
  const visibleProblemCount =
    (options.showServers ? overview.servers.total - overview.servers.healthy : 0) +
    (options.showStacks ? overview.stacks.total - overview.stacks.healthy : 0) +
    (options.showDeployments ? overview.deployments.total - overview.deployments.healthy : 0);
  const visibleProblems = overview.problems
    .filter((problem) => {
      if (problem.kind === "server") return options.showServers;
      if (problem.kind === "stack") return options.showStacks;
      return options.showDeployments;
    })
    .slice(0, 20);
  const problemColor = visibleProblemCount > 0 ? "red" : "green";
  const summaries: SummaryCardProps[] = [];

  if (options.showServers) {
    summaries.push({
      icon: IconServer,
      label: t("resource.servers"),
      value: `${overview.servers.healthy} / ${overview.servers.total}`,
      detail: t("state.online"),
      color: getSummaryColor(overview.servers),
    });
  }
  if (options.showStacks) {
    summaries.push({
      icon: IconStack2,
      label: t("resource.stacks"),
      value: `${overview.stacks.healthy} / ${overview.stacks.total}`,
      detail: t("state.running"),
      color: getSummaryColor(overview.stacks),
    });
  }
  if (options.showDeployments) {
    summaries.push({
      icon: IconRocket,
      label: t("resource.deployments"),
      value: `${overview.deployments.healthy} / ${overview.deployments.total}`,
      detail: t("state.running"),
      color: getSummaryColor(overview.deployments),
    });
  }
  if (options.showProblems) {
    summaries.push({
      icon: IconAlertTriangle,
      label: t("problems"),
      value: visibleProblemCount.toString(),
      detail: visibleProblemCount === 0 ? t("state.healthy") : t("state.attention"),
      color: problemColor,
    });
  }

  if (summaries.length === 0) {
    return (
      <Center h="100%" p="sm">
        <Text c="dimmed" size="sm" ta="center">
          {t("empty.noSections")}
        </Text>
      </Center>
    );
  }

  const maxColumns = width >= 360 ? 2 : 1;
  const columns = Math.min(maxColumns, summaries.length);
  const shouldSpanLastCard = columns > 1 && summaries.length % columns !== 0;
  const summaryRowCount = Math.ceil(summaries.length / columns);
  const minimumProblemListHeight = summaryRowCount * 64 + 96;
  const showProblemList = options.showProblems && height >= minimumProblemListHeight && visibleProblems.length > 0;

  return (
    <Stack h="100%" gap="xs" p="xs" style={{ overflow: "hidden" }}>
      <SimpleGrid
        cols={columns}
        spacing="xs"
        verticalSpacing="xs"
        style={{
          flex: showProblemList ? undefined : 1,
          flexShrink: 0,
          gridAutoRows: showProblemList ? undefined : "minmax(0, 1fr)",
        }}
      >
        {summaries.map((summary, index) => (
          <SummaryCard
            key={summary.label}
            {...summary}
            fullWidth={shouldSpanLastCard && index === summaries.length - 1}
          />
        ))}
      </SimpleGrid>

      {showProblemList ? (
        <ScrollArea flex={1} mih={0} scrollbars={false}>
          <Stack gap={4} pr={4}>
            {visibleProblems.map((problem) => (
              <Paper key={`${problem.kind}-${problem.id}`} withBorder p="xs" radius="md">
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {problem.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t(`resource.${problem.kind}`)}
                    </Text>
                  </Stack>
                  <Badge color={komodoStatusColors[problem.status]} variant="light" size="sm">
                    {formatKomodoState(problem.state)}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </ScrollArea>
      ) : null}
    </Stack>
  );
}

interface SummaryCardProps {
  icon: TablerIcon;
  label: string;
  value: string;
  detail: string;
  color: string;
  fullWidth?: boolean;
}

const SummaryCard = ({ icon: Icon, label, value, detail, color, fullWidth = false }: SummaryCardProps) => (
  <Paper withBorder p="sm" radius="md" h="100%" style={{ minWidth: 0, gridColumn: fullWidth ? "1 / -1" : undefined }}>
    <Group h="100%" gap="sm" wrap="nowrap" align="center">
      <ThemeIcon color={color} variant="light" size="lg" radius="md">
        <Icon size={18} />
      </ThemeIcon>
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Text size="sm" c="dimmed" truncate>
          {label}
        </Text>
        <Group gap={6} align="baseline" wrap="nowrap">
          <Text fz="xl" fw={700} lh={1}>
            {value}
          </Text>
          <Text size="sm" c="dimmed" truncate>
            {detail}
          </Text>
        </Group>
      </Stack>
    </Group>
  </Paper>
);
