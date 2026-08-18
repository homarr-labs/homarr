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
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { getUsableWidgetQueryData } from "../../common/query-state";
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
  height,
}: WidgetComponentProps<"mediaRequests-requestList">) {
  const interactIntegrationIds = new Set(
    useIntegrationsWithInteractAccess()
      .filter(({ id }) => integrationIds.includes(id))
      .map(({ id }) => id),
  );
  const mediaRequestData = getUsableWidgetQueryData(
    clientApi.widget.mediaRequests.getLatestRequests.useQuery({
      integrationIds,
      statuses:
        options.statusFilter.length > 0
          ? options.statusFilter
          : ["pending", "approved", "declined", "failed", "completed"],
      recentDays: options.recentDays,
    }),
  );

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
        scrollbarSize="md"
        style={{ flex: 1, minHeight: 0, pointerEvents: isEditMode ? "none" : undefined }}
      >
        <Stack className="mediaRequests-list-list" gap="xs" p="sm">
          {mediaRequests.map((mediaRequest) => (
            <MediaRequestCard
              key={`${mediaRequest.integrationId}-${mediaRequest.id}`}
              request={mediaRequest}
              isTiny={width <= 256 || height < 96}
              isDense={width < 340 || height < 150}
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
  const t = useScopedI18n("search.mode.media");

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
  isDense: boolean;
  showIntegrationSource: boolean;
  canInteract: boolean;
  options: WidgetComponentProps<"mediaRequests-requestList">["options"];
}

const MediaRequestCard = ({
  request,
  isTiny,
  isDense,
  showIntegrationSource,
  canInteract,
  options,
}: MediaRequestCardProps) => {
  const board = useRequiredBoard();
  const t = useScopedI18n("widget.mediaRequests-requestList");
  const requestHref = getSafeApplicationUrl(request.href);
  const requestedByHref = getSafeApplicationUrl(request.requestedBy?.link);

  return (
    <Card
      className={`mediaRequests-list-item-wrapper mediaRequests-list-item-${request.type} mediaRequests-list-item-${request.status} ${classes.card}`}
      radius={board.itemRadius}
      p={isDense ? 6 : "xs"}
      withBorder
    >
      <Group
        className="mediaRequests-list-item-contents"
        h="100%"
        style={{ zIndex: 1 }}
        justify="space-between"
        wrap="nowrap"
        gap={0}
      >
        <Group
          className="mediaRequests-list-item-left-side"
          h="100%"
          gap={isDense ? "xs" : "md"}
          wrap="nowrap"
          flex={1}
          miw={0}
        >
          {!isTiny && (
            <Image
              className="mediaRequests-list-item-poster"
              src={request.posterImagePath}
              h={isDense ? 36 : 44}
              w="auto"
              radius="sm"
              alt=""
              style={{ flexShrink: 0 }}
            />
          )}

          <Stack gap={2} w="100%" miw={0}>
            <Group gap="xs" justify="space-between" wrap="nowrap" className="mediaRequests-list-item-top-group">
              <Anchor
                className="mediaRequests-list-item-info-second-line mediaRequests-list-item-media-title"
                component={requestHref ? "a" : "span"}
                href={requestHref}
                c="var(--mantine-color-text)"
                target={requestHref ? (options.linksTargetNewTab ? "_blank" : "_self") : undefined}
                rel={requestHref && options.linksTargetNewTab ? SAFE_NEW_TAB_REL : undefined}
                fz={isTiny ? "xs" : "sm"}
                fw={600}
                title={request.name}
                truncate="end"
                style={{ minWidth: 0, flex: 1 }}
              >
                {request.name || "unknown"}
              </Anchor>
              {request.status === "pending" ? (
                <DecisionButtons
                  requestId={request.id}
                  integrationId={request.integrationId}
                  canInteract={canInteract}
                  alwaysVisible={isTiny}
                />
              ) : (
                <StatusBadge status={request.status} />
              )}
            </Group>
            <Group justify="space-between" gap="xs" wrap="nowrap" className="mediaRequests-list-item-bottom-group">
              <Group gap={4} wrap="nowrap" miw={0}>
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
              {!isTiny && (
                <Group className="mediaRequests-list-item-request-user" gap={4} wrap="nowrap" miw={0}>
                  <Avatar
                    className="mediaRequests-list-item-request-user-avatar"
                    src={request.requestedBy?.avatar}
                    size={18}
                  />
                  <Anchor
                    className="mediaRequests-list-item-request-user-name"
                    component={requestedByHref ? "a" : "span"}
                    href={requestedByHref}
                    c="dimmed"
                    target={requestedByHref ? (options.linksTargetNewTab ? "_blank" : "_self") : undefined}
                    rel={requestedByHref && options.linksTargetNewTab ? SAFE_NEW_TAB_REL : undefined}
                    fz="xs"
                    truncate="end"
                    style={{ minWidth: 0, maxWidth: isDense ? 100 : 180 }}
                  >
                    {(request.requestedBy?.displayName ?? "") || "unknown"}
                  </Anchor>
                </Group>
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
  const t = useScopedI18n("widget.mediaRequests-requestList");
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
          size="sm"
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
          size="sm"
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
  const tStatus = useScopedI18n("widget.mediaRequests-requestList.status");

  return (
    <Badge size="xs" color={mediaRequestStatusConfiguration[status].color} variant="light">
      {tStatus(status)}
    </Badge>
  );
};
