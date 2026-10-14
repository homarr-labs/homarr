"use client";

import { IconServerOff } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { BaseWidgetError } from "../errors/base-component";
import { RssFeedNativeView } from "./native-view";

export { feedDescriptionToText, getHostname, getRssEntryDisplay } from "./native-view";

type FeedQueryData = RouterOutputs["widget"]["rssFeed"]["getFeeds"];

const normalizeFeedData = (data: FeedQueryData | FeedQueryData["entries"] | undefined) => {
  if (Array.isArray(data)) return { entries: data, failedFeedCount: 0 };
  return { entries: data?.entries ?? [], failedFeedCount: data?.failedFeedCount ?? 0 };
};

const useLiveFeed = (input: RouterInputs["widget"]["rssFeed"]["getFeeds"]) => {
  const query = clientApi.widget.rssFeed.getFeeds.useQuery(input);
  if (query.error && query.data === undefined) return { hasError: true as const, refetch: query.refetch };
  return {
    hasError: false as const,
    ...normalizeFeedData(query.data),
    isPending: query.isPending,
    isStale: Boolean(query.error),
  };
};

export default function RssFeed({ options, width, height, displayMode }: WidgetComponentProps<"rssFeed">) {
  const feed = useLiveFeed({
    urls: options.feedUrls,
    maximumAmountPosts: typeof options.maximumAmountPosts === "number" ? options.maximumAmountPosts : 100,
    descriptionMaxLength: typeof options.descriptionMaxLength === "number" ? options.descriptionMaxLength : 250,
  });
  const board = useRequiredBoard();
  const t = useI18n("widget.rssFeed");
  if (feed.hasError)
    return (
      <BaseWidgetError
        icon={IconServerOff}
        message={t("error.allFeedsFailed")}
        showLogsLink
        onRetry={() => void feed.refetch()}
      />
    );
  if (feed.isPending) return <WidgetQueryLoadingState />;
  const warning = feed.isStale
    ? t("warning.stale")
    : feed.failedFeedCount > 0
      ? t("warning.partial", { count: feed.failedFeedCount })
      : undefined;
  return (
    <RssFeedNativeView
      entries={feed.entries}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
      itemRadius={board.itemRadius}
      warning={warning}
      emptyState={<WidgetEmptyState />}
      formatRelativeDate={(value) => dayjs(value).fromNow()}
      formatTimestamp={(value) => dayjs(value).format("YYYY-MM-DD HH:mm:ss Z")}
    />
  );
}
