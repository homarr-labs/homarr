"use client";

import { useState } from "react";
import { Center, Divider, Group, Pagination, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconClipboardList, IconCpu2, IconReportAnalytics } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { HealthCheckStatus } from "./health-check-status";
import { QueuePanel } from "./panels/queue.panel";
import { StatisticsPanel } from "./panels/statistics.panel";
import { WorkersPanel } from "./panels/workers.panel";

type Views = "workers" | "queue" | "statistics";

export default function MediaTranscodingWidget({ integrationIds, options }: WidgetComponentProps<"mediaTranscoding">) {
  const [queuePage, setQueuePage] = useState(1);
  const queuePageSize = 10;
  const [transcodingData] = clientApi.widget.mediaTranscoding.getDataAsync.useSuspenseQuery(
    {
      integrationId: integrationIds[0] ?? "",
      pageSize: queuePageSize,
      page: queuePage,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const [view, setView] = useState<Views>(options.defaultView);
  const totalQueuePages = Math.ceil((transcodingData.data.queue.totalCount || 1) / queuePageSize);

  const t = useI18n("widget.mediaTranscoding");

  return (
    <Stack gap={4} h="100%">
      {view === "workers" ? (
        <WorkersPanel workers={transcodingData.data.workers} />
      ) : view === "queue" ? (
        <QueuePanel queue={transcodingData.data.queue} />
      ) : (
        <StatisticsPanel statistics={transcodingData.data.statistics} />
      )}
      <Divider />
      <Group gap="xs" mb={4} ms={4} me={8}>
        <SegmentedControl
          data={[
            {
              label: (
                <Center>
                  <IconCpu2 size={18} />
                  <Text size="xs" ml={8}>
                    {t("tab.workers")}
                  </Text>
                </Center>
              ),
              value: "workers",
            },
            {
              label: (
                <Center>
                  <IconClipboardList size={18} />
                  <Text size="xs" ml={8}>
                    {t("tab.queue")}
                  </Text>
                </Center>
              ),
              value: "queue",
            },
            {
              label: (
                <Center>
                  <IconReportAnalytics size={18} />
                  <Text size="xs" ml={8}>
                    {t("tab.statistics")}
                  </Text>
                </Center>
              ),
              value: "statistics",
            },
          ]}
          value={view}
          onChange={(value) => setView(value as Views)}
          size="xs"
        />
        {view === "queue" && (
          <>
            <Pagination.Root total={totalQueuePages} value={queuePage} onChange={setQueuePage} size="sm">
              <Group gap={5} justify="center">
                <Pagination.First disabled={transcodingData.data.queue.startIndex === 1} />
                <Pagination.Previous disabled={transcodingData.data.queue.startIndex === 1} />
                <Pagination.Next disabled={transcodingData.data.queue.startIndex === totalQueuePages} />
                <Pagination.Last disabled={transcodingData.data.queue.startIndex === totalQueuePages} />
              </Group>
            </Pagination.Root>
            <Text size="xs">
              {t("currentIndex", {
                start: transcodingData.data.queue.startIndex + 1,
                end: transcodingData.data.queue.endIndex + 1,
                total: transcodingData.data.queue.totalCount,
              })}
            </Text>
          </>
        )}
        <Group gap="xs" ml="auto">
          <HealthCheckStatus statistics={transcodingData.data.statistics} />
        </Group>
      </Group>
    </Stack>
  );
}
