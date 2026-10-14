"use client";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { toValidDate } from "@homarr/common";
import { mediaAvailabilityConfiguration, mediaRequestStatusConfiguration } from "@homarr/integrations/types";
import { openMediaRequestSearch } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import type { WidgetComponentProps } from "../../definition";
import { MediaRequestsEmptyState } from "../empty-state";
import { MediaRequestListView, MediaRequestDecisionButtonsView } from "./native-view";
import type { MediaRequestListViewProps } from "./native-view";

export default function MediaServerWidget({
  integrationIds,
  isEditMode,
  options,
  width,
}: WidgetComponentProps<"mediaRequests-requestList">) {
  const t = useI18n("widget.mediaRequests-requestList");
  const interactIntegrationIds = new Set(
    useIntegrationsWithInteractAccess()
      .filter(({ id }) => integrationIds.includes(id))
      .map(({ id }) => id),
  );
  const mediaRequestQuery = clientApi.widget.mediaRequests.getLatestRequests.useQuery({
    integrationIds,
    statuses:
      options.statusFilter.length > 0
        ? options.statusFilter
        : ["pending", "approved", "declined", "failed", "completed"],
    recentDays: options.recentDays,
  });
  const mediaRequestData = getUsableWidgetQueryData(mediaRequestQuery);
  if (isInitialWidgetQueryPending(mediaRequestQuery)) return <WidgetQueryLoadingState />;
  if (!mediaRequestData) return <WidgetEmptyState />;
  if (mediaRequestData.requests.length === 0 && mediaRequestData.failedIntegrations.length === 0) {
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
    <ListProducer
      mediaRequestData={mediaRequestData}
      interactIntegrationIds={interactIntegrationIds}
      isEditMode={isEditMode}
      options={options}
      width={width}
      integrationIds={integrationIds}
    />
  );
}

function ListProducer({
  integrationIds,
  ...props
}: Pick<
  MediaRequestListViewProps,
  "mediaRequestData" | "interactIntegrationIds" | "isEditMode" | "options" | "width"
> & { integrationIds: string[] }) {
  const board = useRequiredBoard();
  const t = useI18n("widget.mediaRequests-requestList");
  const tStatus = useI18n("widget.mediaRequests-requestList.status");
  const tSearch = useI18n("search.mode.media");
  return (
    <MediaRequestListView
      {...props}
      itemRadius={board.itemRadius}
      t={t}
      tStatus={tStatus}
      searchLabel={tSearch("action.search.label")}
      onSearch={() => openMediaRequestSearch({ integrationIds })}
      queryIndicators={<IntegrationErrorIndicator results={props.mediaRequestData.failedIntegrations} />}
      bindings={{
        toValidDate,
        mediaAvailabilityConfiguration,
        mediaRequestStatusConfiguration,
        getSafeApplicationUrl,
        SAFE_NEW_TAB_REL,
      }}
      renderDecisionButtons={(request, canInteract) => (
        <DecisionButtons requestId={request.id} integrationId={request.integrationId} canInteract={canInteract} />
      )}
    />
  );
}

function DecisionButtons({
  requestId,
  integrationId,
  canInteract,
}: {
  requestId: number;
  integrationId: string;
  canInteract: boolean;
}) {
  const utils = clientApi.useUtils();
  const {
    mutate: mutateRequestAnswer,
    isPending,
    error,
  } = clientApi.widget.mediaRequests.answerRequest.useMutation({
    onSettled: () => void utils.widget.mediaRequests.invalidate(),
  });
  const t = useI18n("widget.mediaRequests-requestList");
  return (
    <MediaRequestDecisionButtonsView
      canInteract={canInteract}
      alwaysVisible
      isPending={isPending}
      hasError={Boolean(error)}
      t={t}
      handleDecision={(answer) => {
        if (!canInteract || isPending) return;
        mutateRequestAnswer({ integrationId, requestId, answer });
      }}
    />
  );
}
