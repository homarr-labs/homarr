"use client";

import { ActionIcon, Anchor, Avatar, Badge, Card, Group, Image, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconSearch, IconThumbDown, IconThumbUp } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import type {
  MediaRequestStatus,
  mediaAvailabilityConfiguration,
  mediaRequestStatusConfiguration,
} from "@homarr/integrations/types";
import type { toValidDate } from "@homarr/common";
import type { ScopedTranslationFunction } from "@homarr/translation";
import type { ReactNode } from "react";
import type { CardProps } from "@mantine/core";
import type { MediaNavigationBindings } from "../../rendering/media";
import actionTargetClasses from "../../common/action-target.module.css";
import type { WidgetComponentProps } from "../../definition";
import classes from "./component.module.css";
import searchClasses from "../search-button.module.css";

export interface MediaRequestListViewProps {
  mediaRequestData: RouterOutputs["widget"]["mediaRequests"]["getLatestRequests"];
  interactIntegrationIds: ReadonlySet<string>;
  isEditMode: boolean;
  options: WidgetComponentProps<"mediaRequests-requestList">["options"];
  width: number;
  itemRadius: CardProps["radius"];
  t: ScopedTranslationFunction<"widget.mediaRequests-requestList">;
  tStatus: ScopedTranslationFunction<"widget.mediaRequests-requestList.status">;
  searchLabel: string;
  onSearch: () => void;
  queryIndicators: ReactNode;
  renderDecisionButtons: (request: MediaRequestCardProps["request"], canInteract: boolean) => ReactNode;
  bindings: MediaNavigationBindings & {
    toValidDate: typeof toValidDate;
    mediaAvailabilityConfiguration: typeof mediaAvailabilityConfiguration;
    mediaRequestStatusConfiguration: typeof mediaRequestStatusConfiguration;
  };
}

export function MediaRequestListView({
  mediaRequestData,
  interactIntegrationIds,
  isEditMode,
  options,
  width,
  itemRadius,
  t,
  tStatus,
  searchLabel,
  onSearch,
  queryIndicators,
  renderDecisionButtons,
  bindings,
}: MediaRequestListViewProps) {
  const { requests: mediaRequests, failedIntegrations } = mediaRequestData;
  const showIntegrationSource = new Set(mediaRequests.map(({ integrationId }) => integrationId)).size > 1;

  return (
    <Stack className={searchClasses.searchRoot} gap={0}>
      {!isEditMode && <MediaRequestSearchButton label={searchLabel} onSearch={onSearch} />}
      {failedIntegrations.length > 0 && (
        <Group px="sm" pt="xs">
          {queryIndicators}
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
              itemRadius={itemRadius}
              t={t}
              tStatus={tStatus}
              bindings={bindings}
              renderDecisionButtons={renderDecisionButtons}
            />
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

const MediaRequestSearchButton = ({ label, onSearch }: { label: string; onSearch: () => void }) => {
  return (
    <Tooltip label={label}>
      <ActionIcon
        className={`${searchClasses.searchButton} ${actionTargetClasses.root}`}
        variant="light"
        size="sm"
        aria-label={label}
        onClick={onSearch}
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
  itemRadius: MediaRequestListViewProps["itemRadius"];
  t: MediaRequestListViewProps["t"];
  tStatus: MediaRequestListViewProps["tStatus"];
  bindings: MediaRequestListViewProps["bindings"];
  renderDecisionButtons: MediaRequestListViewProps["renderDecisionButtons"];
}

const MediaRequestCard = ({
  request,
  isTiny,
  showIntegrationSource,
  canInteract,
  options,
  itemRadius,
  t,
  tStatus,
  bindings,
  renderDecisionButtons,
}: MediaRequestCardProps) => {
  const {
    getSafeApplicationUrl,
    SAFE_NEW_TAB_REL,
    toValidDate,
    mediaAvailabilityConfiguration,
    mediaRequestStatusConfiguration,
  } = bindings;
  const requestHref = getSafeApplicationUrl(request.href);
  const requestedByHref = getSafeApplicationUrl(request.requestedBy?.link);

  return (
    <Card
      className={`mediaRequests-list-item-wrapper mediaRequests-list-item-${request.type} mediaRequests-list-item-${request.status}`}
      radius={itemRadius}
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
                  {(request.requestedBy?.displayName ?? "") || t("unknown")}
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
                {request.name || t("unknown")}
              </Anchor>
              {request.status === "pending" ? (
                renderDecisionButtons(request, canInteract)
              ) : (
                <StatusBadge
                  status={request.status}
                  tStatus={tStatus}
                  configuration={mediaRequestStatusConfiguration}
                />
              )}
            </Group>
          </Stack>
        </Group>
      </Group>
    </Card>
  );
};

export interface MediaRequestDecisionButtonsViewProps {
  canInteract: boolean;
  alwaysVisible: boolean;
  isPending: boolean;
  hasError: boolean;
  t: MediaRequestListViewProps["t"];
  handleDecision: (answer: "approve" | "decline") => void;
}

export const MediaRequestDecisionButtonsView = ({
  canInteract,
  alwaysVisible,
  isPending,
  hasError,
  t,
  handleDecision,
}: MediaRequestDecisionButtonsViewProps) => {
  return (
    <Group
      className={`mediaRequests-list-item-pending-buttons ${classes.pendingActions} ${alwaysVisible ? classes.pendingActionsVisible : ""}`}
      gap={4}
      wrap="nowrap"
      aria-invalid={hasError}
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
  tStatus: MediaRequestListViewProps["tStatus"];
  configuration: MediaRequestListViewProps["bindings"]["mediaRequestStatusConfiguration"];
}

const StatusBadge = ({ status, tStatus, configuration }: StatusBadgeProps) => {
  return (
    <Badge size="xs" color={configuration[status].color} variant="light">
      {tStatus(status)}
    </Badge>
  );
};
