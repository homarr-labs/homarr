"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getQueryKey } from "@trpc/react-query";
import {
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
import { setWidgetRuntimeQueries } from "../definition";
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
  widgetStateRef,
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
  setWidgetRuntimeQueries(widgetStateRef, [
    getQueryKey(clientApi.widget.mediaTranscoding.getDataAsync, input, "query"),
  ]);
  const { data: transcodingData } = clientApi.widget.mediaTranscoding.getDataAsync.useQuery(input);

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

  if (isAdvanced) {
    return (
      <Stack gap="xs" h="100%" p="xs">
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
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Pagination total={queuePageCount} value={queuePage} onChange={handleQueuePageChange} size="xs" />
          <HealthCheckStatus statistics={transcodingData.data.statistics} />
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap={4} h="100%">
      {view === "workers" ? (
        <WorkersPanel workers={transcodingData.data.workers} isTiny={isTiny} />
      ) : view === "queue" ? (
        <QueuePanel queue={transcodingData.data.queue} />
      ) : (
        <StatisticsPanel statistics={transcodingData.data.statistics} />
      )}
      <Divider />
      <Group gap="xs" mb={4} ms={4} me={8}>
        <SegmentedControl
          data={views.map((value) => {
            const Icon = viewIcons[value];
            return {
              label: (
                <Center style={{ gap: 4 }}>
                  <Icon size={12} />
                  {isTiny ? (
                    <VisuallyHidden>{t(`tab.${value}`)}</VisuallyHidden>
                  ) : (
                    <Text span size="xs">
                      {t(`tab.${value}`)}
                    </Text>
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
        />

        <Group gap="xs" ml="auto">
          {view === "queue" && (
            <>
              <Pagination.Root total={queuePageCount} value={queuePage} onChange={handleQueuePageChange} size="xs">
                <Group gap={2} justify="center">
                  {!isTiny && <Pagination.First disabled={queuePage === 1} />}
                  <Pagination.Previous disabled={queuePage === 1} />
                  <Pagination.Next disabled={queuePage === queuePageCount} />
                  {!isTiny && <Pagination.Last disabled={queuePage === queuePageCount} />}
                </Group>
              </Pagination.Root>
              <Text size="xs">
                {t("currentIndex", {
                  start: String(transcodingData.data.queue.startIndex + 1),
                  end: String(transcodingData.data.queue.endIndex + 1),
                  total: String(transcodingData.data.queue.totalCount),
                })}
              </Text>
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
      <Icon size={16} />
      <Text size="sm" fw={600}>
        {title}
      </Text>
    </Group>
    {children}
  </Paper>
);
