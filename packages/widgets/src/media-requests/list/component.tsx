import { ActionIcon, Anchor, Avatar, Badge, Card, Group, Image, Stack, Text, Tooltip } from "@mantine/core";

import type { WidgetComponentProps } from "../../definition";
import { MediaRequestStatus } from "../../../../integrations/src/interfaces/media-requests/media-request";
import { useScopedI18n } from "@homarr/translation/client";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";

export default function MediaServerWidget({ isEditMode, options, serverData }: WidgetComponentProps<"mediaRequests-requestList">) {
  if (!serverData?.initialData) return;

  const t = useScopedI18n("widget.mediaRequests-requestList");

  return (
    <Stack gap="2cqmin" p="2cqmin" style={{ pointerEvents: isEditMode ? "none" : undefined }}>
      {serverData.initialData.map((mediaRequest, index) => (
        <Card key={index} w="100%" h="20cqmin" radius="2cqmin" p="2cqmin" withBorder>
          <Image
            src={mediaRequest.backdropImageUrl}
            pos="absolute"
            w="100%"
            h="100%"
            opacity={0.2}
            top={0}
            left={0}
            alt=""
          />

          <Group h="100%" style={{ zIndex: 1 }} justify="space-between" wrap="nowrap">
            <Group h="100%" gap="4cqmin" wrap="nowrap">
              <Image src={mediaRequest.posterImagePath} h="100%" w="10cqmin" radius="1cqmin" />
              <Stack gap="1cqmin">
                <Group>
                  <Text size="3.5cqmin" pt="0.75cqmin">
                    {mediaRequest.createdAt.getFullYear()}
                    {/*Change date property above to release date*/}
                  </Text>
                  <Badge color={GetAvailabilityColor("2")} variant="light" size="5cqmin" fz="3.5cqmin" lh="4cqmin" pt="0.75cqmin">
                    {/*Change GetAvailablityColor above and make table for translation under*/}
                    {mediaRequest.status}
                  </Badge>
                </Group>
                <Anchor
                  href={mediaRequest.href}
                  c="var(--mantine-color-text)"
                  target={options.linksTargetNewTab ? "_blank" : "_self"}
                  lineClamp={1}
                  fz="5cqmin"
                  display="-webkit-box"
                >
                  {/*Remove display property above after updating to mantine 7.11.2*/}
                  {mediaRequest.name || "unknown"}
                </Anchor>
              </Stack>
            </Group>
            <Stack gap="1cqmin" align="end">
              <Group gap="2cqmin" wrap="nowrap">
                <Avatar src={mediaRequest.requestedBy?.profilePictureUrl} size="6cqmin" />
                <Anchor
                  href={mediaRequest.requestedBy?.link}
                  c="var(--mantine-color-text)"
                  target={options.linksTargetNewTab ? "_blank" : "_self"}
                  fz="5cqmin"
                >
                  {(mediaRequest.requestedBy?.username ?? "") || "unknown"}
                </Anchor>
              </Group>
              {mediaRequest.status === MediaRequestStatus.PendingApproval && (
                <Group gap="2cqmin">
                  <Tooltip label={t("pending.approve")}>
                    <ActionIcon
                      variant="light"
                      color="green"
                      size="5cqmin"
                      onClick={() => {/*Place approving function here*/}}
                    >
                      <IconThumbUp size="4cqmin" />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t("pending.decline")}>
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="5cqmin"
                      onClick={() => {/*Place declining function here*/}}
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
  );
}

function GetAvailabilityColor(mediaRequestAvailability: string) {
  switch (mediaRequestAvailability) {
    case "1":
      return "green";
    case "2":
      return "yellow";
    case "3":
      return "red";
    case "4":
      return "violet";
    case "5":
      return "orange";
    default:
      return "blue";
  }
}
