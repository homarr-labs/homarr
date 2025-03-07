"use client";

import { ActionIcon, Anchor, Avatar, Badge, Card, Group, Image, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { MediaAvailability, MediaRequestStatus } from "@homarr/integrations/types";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { NoIntegrationDataError } from "../../errors/no-data-integration";

export default function MediaServerWidget({
  integrationIds,
  isEditMode,
  options,
}: WidgetComponentProps<"mediaRequests-requestList">) {
  const t = useScopedI18n("widget.mediaRequests-requestList");
  const [mediaRequests] = clientApi.widget.mediaRequests.getLatestRequests.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const utils = clientApi.useUtils();
  clientApi.widget.mediaRequests.subscribeToLatestRequests.useSubscription(
    {
      integrationIds,
    },
    {
      onData(data) {
        utils.widget.mediaRequests.getLatestRequests.setData({ integrationIds }, (prevData) => {
          if (!prevData) return [];

          const filteredData = prevData.filter(({ integrationId }) => integrationId !== data.integrationId);
          const newData = filteredData.concat(
            data.requests.map((request) => ({ ...request, integrationId: data.integrationId })),
          );
          return newData.sort((dataA, dataB) => {
            if (dataA.status === dataB.status) {
              return dataB.createdAt.getTime() - dataA.createdAt.getTime();
            }

            return dataA.status - dataB.status;
          });
        });
      },
    },
  );

  const { mutate: mutateRequestAnswer } = clientApi.widget.mediaRequests.answerRequest.useMutation();
  const board = useRequiredBoard();

  if (mediaRequests.length === 0) throw new NoIntegrationDataError();

  return (
    <ScrollArea
      className="mediaRequests-list-scrollArea"
      scrollbarSize="md"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      <Stack className="mediaRequests-list-list" gap="sm" p="sm">
        {mediaRequests.map((mediaRequest) => (
          <Card
            className={`mediaRequests-list-item-wrapper mediaRequests-list-item-${mediaRequest.type} mediaRequests-list-item-${mediaRequest.status}`}
            key={`${mediaRequest.integrationId}-${mediaRequest.id}`}
            radius={board.itemRadius}
            p="sm"
            withBorder
          >
            <Image
              className="mediaRequests-list-item-background"
              src={mediaRequest.backdropImageUrl}
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
              <Group className="mediaRequests-list-item-left-side" h="100%" gap="md" wrap="nowrap" flex={1}>
                <Image
                  className="mediaRequests-list-item-poster"
                  src={mediaRequest.posterImagePath}
                  h={60}
                  w="auto"
                  radius={"md"}
                />
                <Stack className="mediaRequests-list-item-media-infos" gap={0}>
                  <Group className="mediaRequests-list-item-info-first-line" gap="sm" align={"end"} wrap="nowrap">
                    <Text className="mediaRequests-list-item-media-year" size="md" pt="xs">
                      {mediaRequest.airDate?.getFullYear() ?? t("toBeDetermined")}
                    </Text>
                    <Badge
                      className="mediaRequests-list-item-media-status"
                      color={getAvailabilityProperties(mediaRequest.availability, t).color}
                      variant="light"
                      size="md"
                    >
                      {getAvailabilityProperties(mediaRequest.availability, t).label}
                    </Badge>
                  </Group>
                  <Anchor
                    className="mediaRequests-list-item-info-second-line mediaRequests-list-item-media-title"
                    href={mediaRequest.href}
                    c="var(--mantine-color-text)"
                    target={options.linksTargetNewTab ? "_blank" : "_self"}
                    fz="md"
                    fw={"bold"}
                    lineClamp={1}
                  >
                    {mediaRequest.name || "unknown"}
                  </Anchor>
                </Stack>
              </Group>
              <Stack className="mediaRequests-list-item-right-side" gap="xs" ms={"lg"} align="end">
                <Group className="mediaRequests-list-item-request-user" gap="sm" wrap="nowrap">
                  <Avatar
                    className="mediaRequests-list-item-request-user-avatar"
                    src={mediaRequest.requestedBy?.avatar}
                    size="sm"
                  />
                  <Anchor
                    className="mediaRequests-list-item-request-user-name"
                    href={mediaRequest.requestedBy?.link}
                    c="var(--mantine-color-text)"
                    target={options.linksTargetNewTab ? "_blank" : "_self"}
                    fz="md"
                    lineClamp={1}
                    style={{ wordBreak: "break-all" }}
                  >
                    {(mediaRequest.requestedBy?.displayName ?? "") || "unknown"}
                  </Anchor>
                </Group>
                {mediaRequest.status === MediaRequestStatus.PendingApproval ? (
                  <Group className="mediaRequests-list-item-pending-buttons" gap="sm">
                    <Tooltip label={t("pending.approve")}>
                      <ActionIcon
                        className="mediaRequests-list-item-pending-button-approve"
                        variant="light"
                        color="green"
                        size="md"
                        radius={"md"}
                        onClick={() => {
                          mutateRequestAnswer({
                            integrationId: mediaRequest.integrationId,
                            requestId: mediaRequest.id,
                            answer: "approve",
                          });
                        }}
                      >
                        <IconThumbUp size={23} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t("pending.decline")}>
                      <ActionIcon
                        className="mediaRequests-list-item-pending-button-decline"
                        variant="light"
                        color="red"
                        size="md"
                        radius={"md"}
                        onClick={() => {
                          mutateRequestAnswer({
                            integrationId: mediaRequest.integrationId,
                            requestId: mediaRequest.id,
                            answer: "decline",
                          });
                        }}
                      >
                        <IconThumbDown size={23} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ) : (
                  <StatusBadge status={mediaRequest.status} />
                )}
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>
    </ScrollArea>
  );
}

const statusMapping = {
  [MediaRequestStatus.PendingApproval]: { color: "blue", label: (t) => t("pending") },
  [MediaRequestStatus.Approved]: { color: "green", label: (t) => t("approved") },
  [MediaRequestStatus.Declined]: { color: "red", label: (t) => t("declined") },
  [MediaRequestStatus.Failed]: { color: "red", label: (t) => t("failed") },
} satisfies Record<
  MediaRequestStatus,
  {
    color: string;
    label: (t: ScopedTranslationFunction<"widget.mediaRequests-requestList.status">) => string;
  }
>;

interface StatusBadgeProps {
  status: MediaRequestStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { color, label } = statusMapping[status];
  const tStatus = useScopedI18n("widget.mediaRequests-requestList.status");

  return (
    <Badge size="xs" color={color} variant="light">
      {label(tStatus)}
    </Badge>
  );
};

function getAvailabilityProperties(
  mediaRequestAvailability: MediaAvailability,
  t: ScopedTranslationFunction<"widget.mediaRequests-requestList">,
) {
  switch (mediaRequestAvailability) {
    case MediaAvailability.Available:
      return { color: "green", label: t("availability.available") };
    case MediaAvailability.PartiallyAvailable:
      return { color: "yellow", label: t("availability.partiallyAvailable") };
    case MediaAvailability.Processing:
      return { color: "blue", label: t("availability.processing") };
    case MediaAvailability.Pending:
      return { color: "violet", label: t("availability.pending") };
    default:
      return { color: "red", label: t("availability.unknown") };
  }
}
