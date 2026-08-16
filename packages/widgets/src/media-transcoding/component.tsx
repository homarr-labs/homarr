"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getQueryKey } from "@trpc/react-query";
import {
  Box,
  Center,
  Divider,
  Group,
  Pagination,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import { IconClipboardList, IconCpu2, IconReportAnalytics } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { views } from ".";
import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { HealthCheckStatus } from "./health-check-status";
import { QueuePanel } from "./panels/queue.panel";
import { StatisticsPanel } from "./panels/statistics.panel";
import { WorkersPanel } from "./panels/workers.panel";

type View = (typeof views)[number];

const viewBySegmentValue = Object.fromEntries(views.map((view) => [view, view])) as Record<string, View>;

const viewIcons = {
  workers: IconCpu2,
  queue: IconClipboardList,
  statistics: IconReportAnalytics,
} satisfies Record<View, TablerIcon>;

export default function MediaTranscodingWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode,
  widgetRuntimeRef,
}: WidgetComponentProps<"mediaTranscoding">) {
  const isAdvanced = displayMode === "advanced";
  const queuePageSize = getQueuePageSize(height, isAdvanced);
  const [queuePagination, setQueuePagination] = useState<QueuePaginationState>(() => ({
    page: 1,
    pageSize: queuePageSize,
    isAdvanced,
  }));
  const requestPagination = resolveQueuePagination(queuePagination, queuePageSize, isAdvanced, null);
  const input = {
    integrationId: integrationIds[0] ?? "",
    pageSize: queuePageSize,
    page: requestPagination.page,
  };
  useWidgetRuntimeQueries(widgetRuntimeRef, [
    getQueryKey(clientApi.widget.mediaTranscoding.getDataAsync, input, "query"),
  ]);
  const transcodingQuery = clientApi.widget.mediaTranscoding.getDataAsync.useQuery(input);
  const transcodingData = getUsableWidgetQueryData(transcodingQuery);

  const [view, setView] = useState<View>(options.defaultView);
  const t = useI18n("widget.mediaTranscoding");
  const totalQueuePages = transcodingData
    ? Math.max(1, Math.ceil(transcodingData.data.queue.totalCount / queuePageSize))
    : null;
  const resolvedPagination = resolveQueuePagination(queuePagination, queuePageSize, isAdvanced, totalQueuePages);
  const queuePage = resolvedPagination.page;

  useEffect(() => {
    setQueuePagination((current) => {
      const next = resolveQueuePagination(current, queuePageSize, isAdvanced, totalQueuePages);
      return current.page === next.page && current.pageSize === next.pageSize && current.isAdvanced === next.isAdvanced
        ? current
        : next;
    });
  }, [isAdvanced, queuePageSize, totalQueuePages]);

  const handleQueuePageChange = (page: number) => {
    setQueuePagination({ page, pageSize: queuePageSize, isAdvanced });
  };

  if (!transcodingData) return <WidgetEmptyState />;

  const queuePageCount = totalQueuePages ?? 1;
  const isTiny = !isAdvanced && (width < 280 || height < 140);
  const footerLayout = getTranscodingFooterLayout(width, height);
  const queryIndicator = (
    <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
      <WidgetQueryErrorIndicator error={transcodingQuery.error} label={t("name")} />
    </Box>
  );

  if (isAdvanced) {
    return (
      <Stack gap="xs" h="100%" p="xs" pos="relative">
        {queryIndicator}
        <ScrollArea h="100%" style={{ flex: 1 }}>
          <SimpleGrid cols={width >= 1100 ? 3 : width >= 700 ? 2 : 1} spacing="sm">
            <AdvancedPanel title={t("tab.workers")} icon={IconCpu2}>
              <WorkersPanel workers={transcodingData.data.workers} isTiny={false} />
            </AdvancedPanel>
            <AdvancedPanel title={t("tab.queue")} icon={IconClipboardList}>
              <QueuePanel queue={transcodingData.data.queue} />
            </AdvancedPanel>
            <AdvancedPanel title={t("tab.statistics")} icon={IconReportAnalytics}>
              <StatisticsPanel statistics={transcodingData.data.statistics} />
            </AdvancedPanel>
          </SimpleGrid>
        </ScrollArea>
        <Group gap="xs" justify={queuePageCount > 1 ? "space-between" : "flex-end"} wrap="nowrap">
          {queuePageCount > 1 && (
            <QueuePaginationControls
              total={queuePageCount}
              value={queuePage}
              onChange={handleQueuePageChange}
              layout={footerLayout}
            />
          )}
          <HealthCheckStatus statistics={transcodingData.data.statistics} />
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap={4} h="100%" pos="relative">
      {queryIndicator}
      {view === "workers" ? (
        <WorkersPanel workers={transcodingData.data.workers} isTiny={isTiny} />
      ) : view === "queue" ? (
        <QueuePanel queue={transcodingData.data.queue} />
      ) : (
        <StatisticsPanel statistics={transcodingData.data.statistics} />
      )}
      <Divider />
      <Group gap="xs" mb={4} ms={4} me={8} wrap="nowrap">
        <SegmentedControl
          data={views.map((value) => {
            const Icon = viewIcons[value];
            return {
              label: (
                <Center style={{ gap: 4 }}>
                  <Icon size="var(--mantine-font-size-xs)" />
                  {footerLayout.showTabLabels ? (
                    <Text span size="xs">
                      {t(`tab.${value}`)}
                    </Text>
                  ) : (
                    <VisuallyHidden>{t(`tab.${value}`)}</VisuallyHidden>
                  )}
                </Center>
              ),
              value,
            };
          })}
          value={view}
          onChange={(value) => {
            const nextView = viewBySegmentValue[value];
            if (nextView) {
              setView(nextView);
            }
          }}
          size="xs"
          style={{ minWidth: 0, flexShrink: footerLayout.showTabLabels ? 1 : 0 }}
        />

        <Group gap="xs" ml="auto" wrap="nowrap">
          {view === "queue" && queuePageCount > 1 && (
            <>
              <QueuePaginationControls
                total={queuePageCount}
                value={queuePage}
                onChange={handleQueuePageChange}
                layout={footerLayout}
              />
              {footerLayout.showPageRange && (
                <Text size="xs" style={{ whiteSpace: "nowrap" }}>
                  {t("currentIndex", {
                    start: String(transcodingData.data.queue.startIndex + 1),
                    end: String(transcodingData.data.queue.endIndex + 1),
                    total: String(transcodingData.data.queue.totalCount),
                  })}
                </Text>
              )}
            </>
          )}

          <HealthCheckStatus statistics={transcodingData.data.statistics} />
        </Group>
      </Group>
    </Stack>
  );
}

export const getQueuePageSize = (height: number, isAdvanced: boolean): number => {
  if (isAdvanced) return 25;
  return Math.max(3, Math.min(15, Math.floor((height - 84) / 28)));
};

export const getTranscodingFooterLayout = (width: number, height: number) => ({
  showTabLabels: width >= 420 && height >= 160,
  showPageEdges: width >= 360,
  showPageItems: width >= 600,
  showPageRange: width >= 760,
});

interface QueuePaginationControlsProps {
  total: number;
  value: number;
  onChange: (page: number) => void;
  layout: ReturnType<typeof getTranscodingFooterLayout>;
}

const QueuePaginationControls = ({ total, value, onChange, layout }: QueuePaginationControlsProps) => (
  <Pagination.Root total={total} value={value} onChange={onChange} size="xs">
    <Group gap={2} justify="center" wrap="nowrap">
      {layout.showPageEdges && <Pagination.First disabled={value === 1} />}
      <Pagination.Previous disabled={value === 1} />
      {layout.showPageItems && <Pagination.Items />}
      <Pagination.Next disabled={value === total} />
      {layout.showPageEdges && <Pagination.Last disabled={value === total} />}
    </Group>
  </Pagination.Root>
);

interface QueuePaginationState {
  page: number;
  pageSize: number;
  isAdvanced: boolean;
}

export const resolveQueuePagination = (
  state: QueuePaginationState,
  pageSize: number,
  isAdvanced: boolean,
  totalPages: number | null,
): QueuePaginationState => ({
  page:
    state.pageSize !== pageSize || state.isAdvanced !== isAdvanced
      ? 1
      : Math.max(1, totalPages === null ? state.page : Math.min(state.page, totalPages)),
  pageSize,
  isAdvanced,
});

const AdvancedPanel = ({ title, icon: Icon, children }: { title: string; icon: TablerIcon; children: ReactNode }) => (
  <Paper withBorder radius="sm" p="xs" mih={280} style={{ display: "flex", flexDirection: "column" }}>
    <Group gap="xs" mb="xs">
      <Icon size="var(--mantine-font-size-md)" />
      <Text size="sm" fw={600}>
        {title}
      </Text>
    </Group>
    {children}
  </Paper>
);
