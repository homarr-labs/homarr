"use client";

import { useEffect, useState } from "react";
import { getQueryKey } from "@trpc/react-query";
import { useColorScheme } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { MediaTranscodingView, getQueuePageSize, resolveQueuePagination } from "./native-view";
import type { MediaTranscodingViewProps } from "./native-view";

export { getQueuePageSize, resolveQueuePagination, getTranscodingFooterLayout } from "./native-view";

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
  const [queuePagination, setQueuePagination] = useState(() => ({ page: 1, pageSize: queuePageSize, isAdvanced }));
  const requestPagination = resolveQueuePagination(queuePagination, queuePageSize, isAdvanced, null);
  const input = { integrationId: integrationIds[0] ?? "", pageSize: queuePageSize, page: requestPagination.page };
  useWidgetRuntimeQueries(widgetRuntimeRef, [
    getQueryKey(clientApi.widget.mediaTranscoding.getDataAsync, input, "query"),
  ]);
  const transcodingQuery = clientApi.widget.mediaTranscoding.getDataAsync.useQuery(input);
  const transcodingData = getUsableWidgetQueryData(transcodingQuery);
  const [view, setView] = useState(options.defaultView);
  const totalQueuePages = transcodingData
    ? Math.max(1, Math.ceil(transcodingData.data.queue.totalCount / queuePageSize))
    : null;
  const resolvedPagination = resolveQueuePagination(queuePagination, queuePageSize, isAdvanced, totalQueuePages);
  useEffect(() => {
    setQueuePagination((current) => {
      const next = resolveQueuePagination(current, queuePageSize, isAdvanced, totalQueuePages);
      return current.page === next.page && current.pageSize === next.pageSize && current.isAdvanced === next.isAdvanced
        ? current
        : next;
    });
  }, [isAdvanced, queuePageSize, totalQueuePages]);
  if (isInitialWidgetQueryPending(transcodingQuery)) return <WidgetQueryLoadingState />;
  if (!transcodingData) return <WidgetEmptyState />;
  return (
    <TranscodingProducer
      transcodingData={transcodingData}
      view={view}
      setView={setView}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
      queuePage={resolvedPagination.page}
      queuePageCount={totalQueuePages ?? 1}
      handleQueuePageChange={(page) => setQueuePagination({ page, pageSize: queuePageSize, isAdvanced })}
    />
  );
}

function TranscodingProducer(props: Omit<MediaTranscodingViewProps, "t" | "bindings">) {
  const t = useI18n("widget.mediaTranscoding");
  const tCommon = useI18n("widget.mediaTranscoding.panel.common");
  const tQueue = useI18n("widget.mediaTranscoding.panel.queue");
  const tWorkers = useI18n("widget.mediaTranscoding.panel.workers");
  const tStatistics = useI18n("widget.mediaTranscoding.panel.statistics");
  const tHealthCheck = useI18n("widget.mediaTranscoding.healthCheck");
  const { formatBytes } = useByteFormatter();
  const board = useRequiredBoard();
  const colorScheme = useColorScheme();
  return (
    <MediaTranscodingView
      {...props}
      t={t}
      bindings={{
        tCommon,
        tQueue,
        tWorkers,
        tStatistics,
        tHealthCheck,
        formatBytes,
        itemRadius: board.itemRadius,
        colorScheme,
      }}
    />
  );
}
