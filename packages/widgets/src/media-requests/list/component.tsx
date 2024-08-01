import { useMemo } from "react";
import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Card,
  Center,
  Group,
  Image,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import {
  MediaAvailability,
  MediaRequestStatus,
} from "../../../../integrations/src/interfaces/media-requests/media-request";
import type { WidgetComponentProps } from "../../definition";
import type { ScopedTranslationFunction } from "@homarr/translation";

export default function MediaServerWidget({
  integrationIds,
  isEditMode,
  options,
  serverData,
  itemId
}: WidgetComponentProps<"mediaRequests-requestList">) {
  const t = useScopedI18n("widget.mediaRequests-requestList");
  const tCommon = useScopedI18n("common");
  const isQueryEnabled = Boolean(itemId);
  const {
    data: mediaRequests,
    isError: _isError,
  } = clientApi.widget.mediaRequests.getLatestRequests.useQuery(
    {
      integrationIds,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      itemId: itemId!,
    },
    {
      initialData:
        !serverData ? [] : serverData.initialData,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: integrationIds.length > 0 && isQueryEnabled,
    },
  );

  const sortedMediaRequests = useMemo(
    () =>
      mediaRequests
        .filter((group) => group != null)
        .flatMap((group) => group.data)
        .flatMap(({ medias, integration }) => medias.map((media) => ({ ...media, integrationId: integration.id })))
        .sort(({ status: statusA }, { status: statusB }) => {
          if (statusA === MediaRequestStatus.PendingApproval) {
            return -1;
          }
          if (statusB === MediaRequestStatus.PendingApproval) {
            return 1;
          }
          return 0;
        }),
    [mediaRequests, integrationIds],
  );

  const { mutate: mutateRequestAnswer } = clientApi.widget.mediaRequests.answerRequest.useMutation();

  if (integrationIds.length === 0) return <Center h="100%">{tCommon("errors.noIntegration")}</Center>;

  if (sortedMediaRequests.length === 0) return <Center h="100%">{tCommon("errors.noData")}</Center>;

  return (
    <ScrollArea
      className="mediaRequests-list-scrollArea"
      scrollbarSize="2cqmin"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      <Stack className="mediaRequests-list-list" gap="2cqmin" p="2cqmin">
        {sortedMediaRequests.map((mediaRequest) => (
          <Card
            className={`mediaRequests-list-item-wrapper mediaRequests-list-item-${mediaRequest.type} mediaRequests-list-item-${mediaRequest.status}`}
            key={mediaRequest.id}
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
                      color={GetAvailabilityProperties(mediaRequest.availability, t).color}
                      variant="light"
                      fz="3.5cqmin"
                      lh="4cqmin"
                      size="5cqmin"
                      pt="0.75cqmin"
                      px="2cqmin"
                    >
                      {GetAvailabilityProperties(mediaRequest.availability, t).label}
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

function GetAvailabilityProperties(mediaRequestAvailability: MediaAvailability, t: ScopedTranslationFunction<"widget.mediaRequests-requestList">) {
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
