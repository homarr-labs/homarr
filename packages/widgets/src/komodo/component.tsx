"use client";

import { Badge, Group, Paper, ScrollArea, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
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

export default function KomodoWidget({ integrationIds, width, height }: WidgetComponentProps<"komodo">) {
  const t = useScopedI18n("widget.komodo");
  const integrationId = integrationIds[0];
  const { data } = clientApi.widget.komodo.getOverview.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: integrationId !== undefined },
  );

  if (!integrationId || !data) return <WidgetEmptyState />;

  const { overview } = data;
  const columns = width >= 420 ? 4 : width >= 170 ? 2 : 1;
  const showProblems = height >= 250 && overview.problems.length > 0;
  const problemColor = overview.problemCount > 0 ? "red" : "green";

  return (
    <ScrollArea h="100%" type="auto">
      <Stack gap="xs" p="xs">
        <SimpleGrid cols={columns} spacing="xs" verticalSpacing="xs">
          <SummaryCard
            icon={IconServer}
            label={t("resource.servers")}
            value={`${overview.servers.healthy} / ${overview.servers.total}`}
            detail={t("state.online")}
            color={getSummaryColor(overview.servers)}
          />
          <SummaryCard
            icon={IconStack2}
            label={t("resource.stacks")}
            value={`${overview.stacks.healthy} / ${overview.stacks.total}`}
            detail={t("state.running")}
            color={getSummaryColor(overview.stacks)}
          />
          <SummaryCard
            icon={IconRocket}
            label={t("resource.deployments")}
            value={`${overview.deployments.healthy} / ${overview.deployments.total}`}
            detail={t("state.running")}
            color={getSummaryColor(overview.deployments)}
          />
          <SummaryCard
            icon={IconAlertTriangle}
            label={t("problems")}
            value={overview.problemCount.toString()}
            detail={overview.problemCount === 0 ? t("state.healthy") : t("state.attention")}
            color={problemColor}
          />
        </SimpleGrid>

        {showProblems ? (
          <Stack gap={4}>
            {overview.problems.map((problem) => (
              <Group key={`${problem.kind}-${problem.id}`} justify="space-between" gap="xs" wrap="nowrap">
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
            ))}
          </Stack>
        ) : null}
      </Stack>
    </ScrollArea>
  );
}

interface SummaryCardProps {
  icon: TablerIcon;
  label: string;
  value: string;
  detail: string;
  color: string;
}

const SummaryCard = ({ icon: Icon, label, value, detail, color }: SummaryCardProps) => (
  <Paper withBorder p="xs" radius="md">
    <Group gap="xs" wrap="nowrap">
      <ThemeIcon color={color} variant="light" size="md" radius="md">
        <Icon size={16} />
      </ThemeIcon>
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed" truncate>
          {label}
        </Text>
        <Group gap={4} align="baseline" wrap="nowrap">
          <Text fw={700} lh={1.1}>
            {value}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {detail}
          </Text>
        </Group>
      </Stack>
    </Group>
  </Paper>
);
