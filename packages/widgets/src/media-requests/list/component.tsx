"use client";

import { ActionIcon, Anchor, Avatar, Badge, Card, Group, Image, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconSearch, IconThumbDown, IconThumbUp } from "@tabler/icons-react";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { toValidDate } from "@homarr/common";
import type { MediaRequestStatus } from "@homarr/integrations/types";
import { mediaAvailabilityConfiguration, mediaRequestStatusConfiguration } from "@homarr/integrations/types";
import { openMediaRequestSearch } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import actionTargetClasses from "../../common/action-target.module.css";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import type { WidgetComponentProps } from "../../definition";
import { NoIntegrationDataError } from "../../errors/no-data-integration";
import classes from "./component.module.css";
import searchClasses from "../search-button.module.css";

export default function MediaServerWidget({
  integrationIds,
  isEditMode,
  options,
  width,
}: WidgetComponentProps<"mediaRequests-requestList">) {
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
  const { requests: mediaRequests, failedIntegrations } = mediaRequestData;
  if (mediaRequests.length === 0 && failedIntegrations.length === 0) throw new NoIntegrationDataError();
  const showIntegrationSource = new Set(mediaRequests.map(({ integrationId }) => integrationId)).size > 1;

  return (
    <Stack className={searchClasses.searchRoot} gap={0}>
      {!isEditMode && <MediaRequestSearchButton integrationIds={integrationIds} />}
      {failedIntegrations.length > 0 && (
        <Group px="sm" pt="xs">
          <IntegrationErrorIndicator results={failedIntegrations} />
        </Group>
      )}
      <ScrollArea
        className="mediaRequests-list-scrollArea"
        style={{ flex: 1, minHeight: 0, pointerEvents: isEditMode ? "none" : undefined }}
      >
        <Stack className="mediaRequests-list-list" gap="xs" p="sm">
          {mediaRequests.map((mediaRequest) => (
            <MediaRequestCard
              key={`${mediaRequest.integrationId}-${mediaRequest.id}`}
              request={mediaRequest}
              isTiny={width <= 256}
              showIntegrationSource={showIntegrationSource}
              canInteract={interactIntegrationIds.has(mediaRequest.integrationId)}
              options={options}
            />
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

const MediaRequestSearchButton = ({ integrationIds }: { integrationIds: string[] }) => {
  const t = useI18n("search.mode.media");

  return (
    <Tooltip label={t("action.search.label")}>
      <ActionIcon
        className={`${searchClasses.searchButton} ${actionTargetClasses.root}`}
        variant="light"
        size="sm"
        aria-label={t("action.search.label")}
        onClick={() => openMediaRequestSearch({ integrationIds })}
      >
        <IconSearch size="var(--mantine-font-size-md)" />
      </ActionIcon>
    </Tooltip>
  );
};

interface MediaRequestCardProps {
  request: RouterOutputs["widget"]["mediaRequests"]["getLatestRequests"]["requests"][number];
  isTiny: boolean;
  showIntegrationSource: boolean;
  canInteract: boolean;
  options: WidgetComponentProps<"mediaRequests-requestList">["options"];
}

const MediaRequestCard = ({ request, isTiny, showIntegrationSource, canInteract, options }: MediaRequestCardProps) => {
  const board = useRequiredBoard();
  const t = useI18n("widget.mediaRequests-requestList");
  const requestHref = getSafeApplicationUrl(request.href);
  const requestedByHref = getSafeApplicationUrl(request.requestedBy?.link);

  return (
    <Card
      className={`mediaRequests-list-item-wrapper mediaRequests-list-item-${request.type} mediaRequests-list-item-${request.status}`}
      radius={board.itemRadius}
      p="xs"
    >
      <Image
        className="mediaRequests-list-item-background"
        src={request.backdropImageUrl}
        pos="absolute"
        w="100%"
        h="100%"
        opacity={0.2}
        top={0}
        left={0}
        alt=""
      />
      <Group
        className="mediaRequests-list-item-contents"
        h="100%"
        style={{ zIndex: 1 }}
        justify="space-between"
        wrap="nowrap"
        gap={0}
      >
        <Group className="mediaRequests-list-item-left-side" h="100%" gap="md" wrap="nowrap" flex={1} miw={0}>
          {!isTiny && (
            <Image
              className="mediaRequests-list-item-poster"
              src={request.posterImagePath}
              h={40}
              w="auto"
              radius="md"
              alt=""
              style={{ flexShrink: 0 }}
            />
          )}

          <Stack gap={0} w="100%" miw={0}>
            <Group justify="space-between" gap="xs" className="mediaRequests-list-item-top-group">
              <Group gap="xs" wrap="nowrap" miw={0}>
                <Text className="mediaRequests-list-item-media-year" size="xs">
                  {toValidDate(request.airDate)?.getFullYear() ?? t("toBeDetermined")}
                </Text>
                {!isTiny && (
                  <Badge
                    className="mediaRequests-list-item-media-status"
                    color={mediaAvailabilityConfiguration[request.availability].color}
                    variant="light"
                    size="xs"
                  >
                    {t(`availability.${request.availability}`)}
                  </Badge>
                )}
                {showIntegrationSource && !isTiny && (
                  <Badge size="xs" variant="outline">
                    {request.integration.name}
                  </Badge>
                )}
              </Group>
              <Group className="mediaRequests-list-item-request-user" gap={4} wrap="nowrap" miw={0}>
                <Avatar
                  className="mediaRequests-list-item-request-user-avatar"
                  src={request.requestedBy?.avatar}
                  size="xs"
                />
                <Anchor
                  className="mediaRequests-list-item-request-user-name"
                  component={requestedByHref ? "a" : "span"}
                  href={requestedByHref}
                  c="var(--mantine-color-text)"
                  target={requestedByHref ? (options.linksTargetNewTab ? "_blank" : "_self") : undefined}
                  rel={requestedByHref && options.linksTargetNewTab ? SAFE_NEW_TAB_REL : undefined}
                  fz="xs"
                  lineClamp={1}
                  style={{ wordBreak: "break-all" }}
                >
                  {(request.requestedBy?.displayName ?? "") || "unknown"}
                </Anchor>
              </Group>
            </Group>
            <Group gap="xs" justify="space-between" wrap="nowrap" className="mediaRequests-list-item-bottom-group">
              <Anchor
                className="mediaRequests-list-item-info-second-line mediaRequests-list-item-media-title"
                component={requestHref ? "a" : "span"}
                href={requestHref}
                c="var(--mantine-color-text)"
                target={requestHref ? (options.linksTargetNewTab ? "_blank" : "_self") : undefined}
                rel={requestHref && options.linksTargetNewTab ? SAFE_NEW_TAB_REL : undefined}
                fz={isTiny ? "xs" : "sm"}
                fw="bold"
                title={request.name}
                lineClamp={1}
                style={{ minWidth: 0 }}
              >
                {request.name || "unknown"}
              </Anchor>
              {request.status === "pending" ? (
                <DecisionButtons
                  requestId={request.id}
                  integrationId={request.integrationId}
                  canInteract={canInteract}
                  alwaysVisible
                />
              ) : (
                <StatusBadge status={request.status} />
              )}
            </Group>
          </Stack>
        </Group>
      </Group>
    </Card>
  );
};

interface DecisionButtonsProps {
  requestId: number;
  integrationId: string;
  canInteract: boolean;
  alwaysVisible: boolean;
}

const DecisionButtons = ({ requestId, integrationId, canInteract, alwaysVisible }: DecisionButtonsProps) => {
  const utils = clientApi.useUtils();
  const {
    mutate: mutateRequestAnswer,
    isPending,
    error,
  } = clientApi.widget.mediaRequests.answerRequest.useMutation({
    onSettled: () => void utils.widget.mediaRequests.invalidate(),
  });
  const t = useI18n("widget.mediaRequests-requestList");
  const handleDecision = (answer: RouterInputs["widget"]["mediaRequests"]["answerRequest"]["answer"]) => {
    if (!canInteract || isPending) return;
    mutateRequestAnswer({
      integrationId,
      requestId,
      answer,
    });
  };

  return (
    <Group
      className={`mediaRequests-list-item-pending-buttons ${classes.pendingActions} ${alwaysVisible ? classes.pendingActionsVisible : ""}`}
      gap={4}
      wrap="nowrap"
      aria-invalid={Boolean(error)}
    >
      <Tooltip label={t("pending.approve")}>
        <ActionIcon
          className={`mediaRequests-list-item-pending-button-approve ${actionTargetClasses.root}`}
          variant="light"
          color="green"
          size="xs"
          disabled={!canInteract || isPending}
          aria-label={t("pending.approve")}
          onClick={() => {
            handleDecision("approve");
          }}
        >
          <IconThumbUp size="var(--mantine-font-size-md)" />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("pending.decline")}>
        <ActionIcon
          className={`mediaRequests-list-item-pending-button-decline ${actionTargetClasses.root}`}
          variant="light"
          color="red"
          size="xs"
          disabled={!canInteract || isPending}
          aria-label={t("pending.decline")}
          onClick={() => {
            handleDecision("decline");
          }}
        >
          <IconThumbDown size="var(--mantine-font-size-md)" />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

interface StatusBadgeProps {
  status: MediaRequestStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const tStatus = useI18n("widget.mediaRequests-requestList.status");

  return (
    <Badge size="xs" color={mediaRequestStatusConfiguration[status].color} variant="light">
      {tStatus(status)}
    </Badge>
  );
};
