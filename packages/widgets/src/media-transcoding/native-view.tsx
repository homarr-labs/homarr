"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Button, Divider, Group, Pagination, Paper, ScrollArea, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconClipboardList, IconCpu2, IconReportAnalytics } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import type { ScopedTranslationFunction } from "@homarr/translation";
import type { TranscodingViewBindings } from "./native-view-types";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { HealthCheckStatus } from "./health-check-status";
import { QueuePanel } from "./panels/queue.panel";
import { StatisticsPanel } from "./panels/statistics.panel";
import { WorkersPanel } from "./panels/workers.panel";
import { views } from "./views";

type View = (typeof views)[number];

const viewIcons = {
  workers: IconCpu2,
  queue: IconClipboardList,
  statistics: IconReportAnalytics,
} satisfies Record<View, TablerIcon>;

type TranscodingControlMode = "buttons" | "select";

const narrowWidthLayout = { minimumWidth: 0, advancedColumns: 1, controlMode: "select" } as const;

const widthBreakpoints = [
  { minimumWidth: 1100, advancedColumns: 3, controlMode: "buttons" },
  { minimumWidth: 700, advancedColumns: 2, controlMode: "buttons" },
  { minimumWidth: 560, advancedColumns: 1, controlMode: "buttons" },
  narrowWidthLayout,
] as const satisfies readonly {
  minimumWidth: number;
  advancedColumns: number;
  controlMode: TranscodingControlMode;
}[];

const getTranscodingWidthLayout = (width: number) =>
  widthBreakpoints.find((candidate) => width >= candidate.minimumWidth) ?? narrowWidthLayout;

export interface MediaTranscodingViewProps {
  transcodingData: RouterOutputs["widget"]["mediaTranscoding"]["getDataAsync"];
  options: WidgetComponentProps<"mediaTranscoding">["options"];
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  queuePage: number;
  queuePageCount: number;
  handleQueuePageChange: (page: number) => void;
  t: ScopedTranslationFunction<"widget.mediaTranscoding">;
  bindings: TranscodingViewBindings;
  view: View;
  setView: (view: View) => void;
}

export function MediaTranscodingView({
  transcodingData,
  width,
  height,
  displayMode,
  queuePage,
  queuePageCount,
  handleQueuePageChange,
  t,
  bindings,
  view,
  setView,
}: MediaTranscodingViewProps) {
  const isAdvanced = displayMode === "advanced";
  const widthLayout = useMemo(() => getTranscodingWidthLayout(width), [width]);

  const isTiny = !isAdvanced && (width < 280 || height < 140);
  const footerLayout = getTranscodingFooterLayout(width, height);
  if (isAdvanced) {
    return (
      <Stack gap="xs" h="100%" p="xs" pos="relative">
        <ScrollArea h="100%" style={{ flex: 1 }}>
          <SimpleGrid cols={widthLayout.advancedColumns} spacing="sm">
            <AdvancedPanel title={t("tab.workers")} icon={IconCpu2}>
              <WorkersPanel workers={transcodingData.data.workers} isTiny={false} {...bindings} />
            </AdvancedPanel>
            <AdvancedPanel title={t("tab.queue")} icon={IconClipboardList}>
              <QueuePanel queue={transcodingData.data.queue} {...bindings} />
            </AdvancedPanel>
            <AdvancedPanel title={t("tab.statistics")} icon={IconReportAnalytics}>
              <StatisticsPanel statistics={transcodingData.data.statistics} {...bindings} />
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
          <HealthCheckStatus statistics={transcodingData.data.statistics} {...bindings} />
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap={4} h="100%" pos="relative">
      {view === "workers" ? (
        <WorkersPanel workers={transcodingData.data.workers} isTiny={isTiny} {...bindings} />
      ) : view === "queue" ? (
        <QueuePanel queue={transcodingData.data.queue} {...bindings} />
      ) : (
        <StatisticsPanel statistics={transcodingData.data.statistics} {...bindings} />
      )}
      <Divider />
      <Group gap="xs" mb={4} ms={4} me={8} wrap="nowrap">
        {widthLayout.controlMode === "buttons" ? (
          <Button.Group style={{ flex: 1, minWidth: 0 }}>
            {views.map((value) => {
              const Icon = viewIcons[value];
              return (
                <Button
                  key={value}
                  size="compact-xs"
                  variant={value === view ? "filled" : "default"}
                  leftSection={<Icon size="var(--mantine-font-size-xs)" />}
                  aria-pressed={value === view}
                  style={{ flex: 1 }}
                  onClick={() => setView(value)}
                >
                  {t(`tab.${value}`)}
                </Button>
              );
            })}
          </Button.Group>
        ) : (
          <Select
            size="xs"
            value={view}
            data={views.map((value) => ({
              value,
              label: t(`tab.${value}`),
            }))}
            aria-label={t("option.defaultView.label")}
            style={{ flex: 1, minWidth: 0 }}
            onChange={(value) => {
              if (!value) return;

              const nextView = views.find((candidate) => candidate === value);
              if (nextView) {
                setView(nextView);
              }
            }}
          />
        )}

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

          <HealthCheckStatus statistics={transcodingData.data.statistics} {...bindings} />
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
      <Icon size="var(--mantine-font-size-md)" style={{ flexShrink: 0 }} />
      <Text size="sm" fw={600}>
        {title}
      </Text>
    </Group>
    {children}
  </Paper>
);
