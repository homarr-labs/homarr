"use client";

import { ActionIcon, Anchor, Avatar, Badge, Card, Group, Image, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
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

  if (mediaRequests.length === 0) throw new NoIntegrationDataError();

  return (
    <ScrollArea
      className="mediaRequests-list-scrollArea"
      scrollbarSize="2cqmin"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      <Stack className="mediaRequests-list-list" gap="2cqmin" p="2cqmin">
        {mediaRequests.map((mediaRequest) => (
          <Card
            className={`mediaRequests-list-item-wrapper mediaRequests-list-item-${mediaRequest.type} mediaRequests-list-item-${mediaRequest.status}`}
            key={`${mediaRequest.integrationId}-${mediaRequest.id}`}
            h="20cqmin"
            radius="2cqmin"
            p="2cqmin"
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
              <Group className="mediaRequests-list-item-left-side" h="100%" gap="4cqmin" wrap="nowrap" flex={1}>
                <Image
                  className="mediaRequests-list-item-poster"
                  src={mediaRequest.posterImagePath}
                  h="100%"
                  w="10cqmin"
                  radius="1cqmin"
                />
                <Stack className="mediaRequests-list-item-media-infos" gap="1cqmin">
                  <Group className="mediaRequests-list-item-info-first-line" gap="2cqmin" wrap="nowrap">
                    <Text className="mediaRequests-list-item-media-year" size="3.5cqmin" pt="0.75cqmin">
                      {mediaRequest.airDate?.getFullYear() ?? t("toBeDetermined")}
                    </Text>
                    <Badge
                      className="mediaRequests-list-item-media-status"
                      color={getAvailabilityProperties(mediaRequest.availability, t).color}
                      variant="light"
                      fz="3.5cqmin"
                      lh="4cqmin"
                      size="5cqmin"
                      pt="0.75cqmin"
                      px="2cqmin"
                    >
                      {getAvailabilityProperties(mediaRequest.availability, t).label}
                    </Badge>
                  </Group>
                  <Anchor
                    className="mediaRequests-list-item-info-second-line mediaRequests-list-item-media-title"
                    href={mediaRequest.href}
                    c="var(--mantine-color-text)"
                    target={options.linksTargetNewTab ? "_blank" : "_self"}
                    fz="5cqmin"
                    lineClamp={1}
                  >
                    {mediaRequest.name || "unknown"}
                  </Anchor>
                </Stack>
              </Group>
              <Stack className="mediaRequests-list-item-right-side" gap="1cqmin" align="end">
                <Group className="mediaRequests-list-item-request-user" gap="2cqmin" wrap="nowrap">
                  <Avatar
                    className="mediaRequests-list-item-request-user-avatar"
                    src={mediaRequest.requestedBy?.avatar}
                    size="6cqmin"
                  />
                  <Anchor
                    className="mediaRequests-list-item-request-user-name"
                    href={mediaRequest.requestedBy?.link}
                    c="var(--mantine-color-text)"
                    target={options.linksTargetNewTab ? "_blank" : "_self"}
                    fz="5cqmin"
                    lineClamp={1}
                    style={{ wordBreak: "break-all" }}
                  >
                    {(mediaRequest.requestedBy?.displayName ?? "") || "unknown"}
                  </Anchor>
                </Group>
                {mediaRequest.status === MediaRequestStatus.PendingApproval && (
                  <Group className="mediaRequests-list-item-pending-buttons" gap="2cqmin">
                    <Tooltip label={t("pending.approve")}>
                      <ActionIcon
                        className="mediaRequests-list-item-pending-button-approve"
                        variant="light"
                        color="green"
                        size="5cqmin"
                        onClick={() => {
                          mutateRequestAnswer({
                            integrationId: mediaRequest.integrationId,
                            requestId: mediaRequest.id,
                            answer: "approve",
                          });
                        }}
                      >
                        <IconThumbUp size="4cqmin" />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t("pending.decline")}>
                      <ActionIcon
                        className="mediaRequests-list-item-pending-button-decline"
                        variant="light"
                        color="red"
                        size="5cqmin"
                        onClick={() => {
                          mutateRequestAnswer({
                            integrationId: mediaRequest.integrationId,
                            requestId: mediaRequest.id,
                            answer: "decline",
                          });
                        }}
                      >
                        <IconThumbDown size="4cqmin" />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>
    </ScrollArea>
  );
}

function getAvailabilityProperties(
  mediaRequestAvailability: MediaAvailability,
  t: ScopedTranslationFunction<"widget.mediaRequests-requestList">,
) {
  switch (mediaRequestAvailability) {
    case MediaAvailability.Available:
      return { color: "green", label: t("availability.available") };
    case MediaAvailability.PartiallyAvailable:
      return { color: "yellow", label: t("availability.partiallyAvailable") };
    case MediaAvailability.Pending:
      return { color: "violet", label: t("availability.pending") };
    case MediaAvailability.Processing:
      return { color: "blue", label: t("availability.processing") };
    default:
      return { color: "red", label: t("availability.unknown") };
  }
}
