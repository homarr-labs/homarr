"use client";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { openMediaRequestSearch } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import type { WidgetComponentProps } from "../../definition";
import { MediaRequestsEmptyState } from "../empty-state";
import { MediaRequestStatsView } from "./native-view";

export default function MediaServerWidget({
  integrationIds,
  isEditMode,
  width,
  height,
}: WidgetComponentProps<"mediaRequests-requestStats">) {
  const t = useI18n("widget.mediaRequests-requestStats");
  const tCommon = useI18n("common");
  const tSearch = useI18n("search.mode.media");
  const requestStatsQuery = clientApi.widget.mediaRequests.getStats.useQuery({ integrationIds });
  const requestStats = getUsableWidgetQueryData(requestStatsQuery);
  const board = useRequiredBoard();
  if (isInitialWidgetQueryPending(requestStatsQuery)) return <WidgetQueryLoadingState />;
  if (!requestStats) return <WidgetEmptyState />;
  if (
    requestStats.users.length === 0 &&
    requestStats.stats.length === 0 &&
    requestStats.failedIntegrations.length === 0
  ) {
    return (
      <MediaRequestsEmptyState
        title={t("empty.title")}
        description={t("empty.description")}
        integrationIds={integrationIds}
        isEditMode={isEditMode}
      />
    );
  }
  return (
    <MediaRequestStatsView
      requestStats={requestStats}
      isEditMode={isEditMode}
      width={width}
      height={height}
      itemRadius={board.itemRadius}
      t={t}
      tCommon={tCommon}
      searchLabel={tSearch("action.search.label")}
      onSearch={() => openMediaRequestSearch({ integrationIds })}
      queryIndicators={<IntegrationErrorIndicator results={requestStats.failedIntegrations} />}
      getSafeApplicationUrl={getSafeApplicationUrl}
      SAFE_NEW_TAB_REL={SAFE_NEW_TAB_REL}
    />
  );
}
