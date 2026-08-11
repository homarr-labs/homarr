"use client";

import { Badge, Center, Group, Paper, ScrollArea, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconRocket, IconServer, IconStack2 } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { KomodoResourceStatus, KomodoResourceSummary } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";

const statusColors: Record<KomodoResourceStatus, string> = {
  healthy: "green",
  warning: "yellow",
  error: "red",
  unknown: "gray",
};

const getSummaryColor = (summary: KomodoResourceSummary) => {
  if (summary.error > 0) return "red";
  if (summary.unknown > 0) return "gray";
  if (summary.warning > 0) return "yellow";
  return "green";
};

const formatState = (state: string) =>
  state
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());

export default function KomodoWidget({ integrationIds, options, width, height }: WidgetComponentProps<"komodo">) {
  const t = useScopedI18n("widget.komodo");
  const integrationId = integrationIds[0];
  const { data } = clientApi.widget.komodo.getOverview.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: integrationId !== undefined },
  );

  if (!integrationId || !data) return <WidgetEmptyState />;

  const { overview } = data;
  const problemColor = overview.problemCount > 0 ? "red" : "green";
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
      value: overview.problemCount.toString(),
      detail: overview.problemCount === 0 ? t("state.healthy") : t("state.attention"),
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

  const maxColumns = width >= 680 ? 4 : width >= 360 ? 2 : 1;
  const columns = Math.min(maxColumns, summaries.length);
  const shouldSpanLastCard = columns > 1 && summaries.length % columns !== 0;
  const showProblemList = options.showProblems && height >= 250 && overview.problems.length > 0;

  return (
    <Stack h="100%" gap="xs" p="xs" style={{ overflow: "hidden" }}>
      <SimpleGrid
        cols={columns}
        spacing="xs"
        verticalSpacing="xs"
        style={{
          flex: showProblemList ? undefined : 1,
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
        <ScrollArea flex={1} type="auto" scrollbarSize={4}>
          <Stack gap={4} pr={4}>
            {overview.problems.map((problem) => (
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
                  <Badge color={statusColors[problem.status]} variant="light" size="sm">
                    {formatState(problem.state)}
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
