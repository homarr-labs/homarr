"use client";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { NativeUmamiTopListView } from "./native-view";

import { useUmamiQueryOptions } from "./umami-utils";
import { getUsableWidgetQueryData } from "../common/query-state";

interface UmamiTopListProps {
  integrationIds: string[];
  websiteId: string;
  timeFrame: string;
  limit: number;
}

export function UmamiTopPagesContent({ integrationIds, websiteId, timeFrame, limit }: UmamiTopListProps) {
  const t = useI18n("widget.umami");
  const umamiQueryOptions = useUmamiQueryOptions();
  const data =
    getUsableWidgetQueryData(
      clientApi.widget.umami.getTopPages.useQuery(
        { integrationId: integrationIds[0] ?? "", websiteId, timeFrame, limit },
        umamiQueryOptions,
      ),
    ) ?? [];
  return (
    <NativeUmamiTopListView items={data} heading={t("option.viewMode.option.topPages")} emptyLabel={t("top.direct")} />
  );
}

export function UmamiTopReferrersContent({ integrationIds, websiteId, timeFrame, limit }: UmamiTopListProps) {
  const t = useI18n("widget.umami");
  const umamiQueryOptions = useUmamiQueryOptions();
  const data =
    getUsableWidgetQueryData(
      clientApi.widget.umami.getTopReferrers.useQuery(
        { integrationId: integrationIds[0] ?? "", websiteId, timeFrame, limit },
        umamiQueryOptions,
      ),
    ) ?? [];
  return (
    <NativeUmamiTopListView
      items={data}
      heading={t("option.viewMode.option.topReferrers")}
      emptyLabel={t("top.direct")}
    />
  );
}
