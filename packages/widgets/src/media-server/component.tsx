"use client";

import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import { Avatar, Badge, Divider, Flex, Group, Progress, Stack, Text, Title } from "@mantine/core";
import {
  IconDeviceTv,
  IconHeadphones,
  IconMovie,
  IconPlayerPause,
  IconVideo,
  IconWifi,
  IconWorld,
} from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import { clientApi } from "@homarr/api/client";
import { objectEntries } from "@homarr/common";
import { getIconUrl, integrationDefs } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import type { WidgetComponentProps } from "../definition";

type TranscodingDecision = NonNullable<
  NonNullable<StreamSession["currentlyPlaying"]>["metadata"]
>["transcoding"];

type PlaybackStatus = "directPlay" | "directStream" | "transcodeVideo" | "transcodeAudio" | "transcoding";

function getPlaybackStatus(transcoding: TranscodingDecision | undefined): PlaybackStatus {
  if (!transcoding) return "directPlay";
  const { isVideoDirect, isAudioDirect, containerChanged } = transcoding;

  if (isVideoDirect && isAudioDirect) return containerChanged ? "directStream" : "directPlay";
  if (!isVideoDirect && isAudioDirect) return "transcodeVideo";
  if (isVideoDirect && !isAudioDirect) return "transcodeAudio";
  return "transcoding";
}

const playbackStatusColorMap = {
  directPlay: "green",
  directStream: "teal",
  transcodeVideo: "orange",
  transcodeAudio: "yellow",
  transcoding: "red",
} satisfies Record<PlaybackStatus, string>;

function formatBitrate(bitrateKbps: number | null | undefined): string | null {
  if (!bitrateKbps || bitrateKbps <= 0) return null;
  return bitrateKbps >= 1000 ? `${(bitrateKbps / 1000).toFixed(1)} Mbps` : `${Math.round(bitrateKbps)} kbps`;
}

export default function MediaServerWidget({ options, integrationIds }: WidgetComponentProps<"mediaServer">) {
  const { data: currentStreams = [] } = clientApi.widget.mediaServer.getCurrentStreams.useQuery({
    integrationIds,
    showOnlyPlaying: options.showOnlyPlaying,
  });

  const t = useScopedI18n("widget.mediaServer");
  const columns = useMemo<MRT_ColumnDef<StreamSession>[]>(
    () => [
      {
        accessorKey: "user.username",
        header: t("items.user"),
        size: 160,

        Cell: ({ row }) => (
          <Group gap="xs" wrap="nowrap">
            <Avatar size={28} src={row.original.user.profilePictureUrl} />
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="xs" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.original.user.username}
              </Text>
              <Text
                size="10px"
                c="dimmed"
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {row.original.sessionName}
              </Text>
            </Stack>
          </Group>
        ),
      },
      {
        accessorKey: "currentlyPlaying", // currentlyPlaying.name can be undefined which results in a warning. This is why we use currentlyPlaying instead of currentlyPlaying.name
        header: t("items.currentlyPlaying"),

        Cell: ({ row }) => {
          const currentlyPlaying = row.original.currentlyPlaying;
          if (!currentlyPlaying) return null;

          const playback = currentlyPlaying.playback;
          const isPaused = playback?.state === "paused";
          const Icon = isPaused ? IconPlayerPause : mediaTypeIconMap[currentlyPlaying.type];

          const positionMs = playback?.positionMs ?? null;
          const durationMs = playback?.durationMs ?? null;
          const progressPercent =
            positionMs !== null && durationMs !== null && durationMs > 0
              ? Math.min(100, Math.round((positionMs / durationMs) * 100))
              : null;
          const remainingMinutes =
            positionMs !== null && durationMs !== null ? Math.max(0, Math.round((durationMs - positionMs) / 60_000)) : null;

          return (
            <Stack gap={4} style={{ minWidth: 0 }}>
              <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                <Icon
                  size={16}
                  color={isPaused ? "var(--mantine-color-yellow-6)" : undefined}
                  style={{ flexShrink: 0 }}
                />
                <Text size="xs" lineClamp={1} style={{ minWidth: 0 }}>
                  {currentlyPlaying.name}
                </Text>
                {isPaused && (
                  <Text size="xs" c="yellow" style={{ flexShrink: 0 }}>
                    {t("items.paused")}
                  </Text>
                )}
                {!isPaused && remainingMinutes !== null && (
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {t("items.remaining", { minutes: remainingMinutes.toString() })}
                  </Text>
                )}
              </Group>
              {progressPercent !== null && (
                <Progress
                  value={progressPercent}
                  size={4}
                  color={isPaused ? "yellow" : "green"}
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                />
              )}
            </Stack>
          );
        },
      },
      {
        id: "status",
        header: t("items.status"),
        size: 110,

        Cell: ({ row }) => {
          const currentlyPlaying = row.original.currentlyPlaying;
          if (!currentlyPlaying) return null;

          const status = getPlaybackStatus(currentlyPlaying.metadata?.transcoding);
          const bitrateLabel = formatBitrate(currentlyPlaying.metadata?.bitrateKbps);

          return (
            <Stack gap={4} align="flex-start">
              <Badge size="xs" variant="light" color={playbackStatusColorMap[status]}>
                {t(`items.${status}` as never)}
              </Badge>
              {(currentlyPlaying.location ?? bitrateLabel) && (
                <Group gap={4} align="center" justify="space-between" wrap="nowrap" w="100%">
                  <Group gap={4} align="center">
                    {currentlyPlaying.location &&
                      (currentlyPlaying.location === "lan" ? <IconWifi size={12} /> : <IconWorld size={12} />)}
                    {currentlyPlaying.location && (
                      <Text size="10px" c="dimmed" tt="uppercase">
                        {currentlyPlaying.location}
                      </Text>
                    )}
                  </Group>
                  {bitrateLabel && (
                    <Text size="10px" c="dimmed">
                      {bitrateLabel}
                    </Text>
                  )}
                </Group>
              )}
            </Stack>
          );
        },
      },
    ],
    [t],
  );

  // Only render the flat list of sessions when the currentStreams change
  // Otherwise it will always create a new array reference and cause the table to re-render
  const flatSessions = useMemo(
    () =>
      currentStreams.flatMap((pair) =>
        pair.sessions.map((session) => ({
          ...session,
          integrationKind: pair.integrationKind,
          integrationName: integrationDefs[pair.integrationKind].name,
          integrationIcon: getIconUrl(pair.integrationKind),
        })),
      ),
    [currentStreams],
  );

  const { openModal } = useModalAction(ItemInfoModal);
  const table = useTranslatedMantineReactTable({
    columns,
    data: flatSessions,
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableSorting: false,
    enableColumnActions: false,
    enableStickyHeader: false,
    enableColumnOrdering: false,
    enableRowSelection: false,
    enableFullScreenToggle: false,
    enableGlobalFilter: false,
    enableDensityToggle: false,
    enableFilters: false,
    enableHiding: false,
    enableColumnPinning: true,
    initialState: {
      density: "xs",
      columnPinning: {
        right: ["currentlyPlaying", "status"],
      },
    },
    mantineTableHeadProps: {
      fz: "xs",
    },
    mantineTableHeadCellProps: {
      py: 4,
    },
    mantinePaperProps: {
      flex: 1,
      withBorder: false,
      shadow: undefined,
    },
    mantineTableProps: {
      className: "media-server-widget-table",
      style: {
        tableLayout: "fixed",
      },
    },
    mantineTableContainerProps: {
      style: {
        height: "100%",
      },
    },
    mantineTableBodyCellProps: ({ row }) => ({
      onClick: () => {
        openModal(
          {
            item: row.original,
          },
          {
            title: row.original.sessionName,
          },
        );
      },
      py: 4,
      style: {
        overflowX: "hidden",
        overflowY: "visible",
      },
    }),
  });

  const uniqueIntegrations = Array.from(new Set(flatSessions.map((session) => session.integrationKind))).map((kind) => {
    const session = flatSessions.find((session) => session.integrationKind === kind);
    return {
      integrationKind: kind,
      integrationIcon: session?.integrationIcon,
      integrationName: session?.integrationName,
    };
  });

  const totalBitrateKbps = flatSessions.reduce(
    (sum, session) => sum + (session.currentlyPlaying?.metadata?.bitrateKbps ?? 0),
    0,
  );
  const totalBitrateLabel = options.showBitrate ? formatBitrate(totalBitrateKbps) : null;

  return (
    <Stack gap={0} h="100%" display="flex">
      <MantineReactTable table={table} />
      <Group
        gap="xs"
        h={30}
        px="xs"
        pr="md"
        justify="space-between"
        style={{
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <Group gap={4} wrap="nowrap">
          <IconVideo size={16} style={{ flexShrink: 0 }} />
          <Text size="sm" style={{ whiteSpace: "nowrap" }}>
            {t("footer.streams", { count: flatSessions.length.toString() })}
          </Text>
          {totalBitrateLabel && (
            <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {t("footer.totalBitrate", { bitrate: totalBitrateLabel })}
            </Text>
          )}
        </Group>
        <Group gap="xs">
          {uniqueIntegrations.map((integration) => (
            <Group key={integration.integrationKind} gap="xs" align="center">
              <Avatar className="media-server-icon" src={integration.integrationIcon} radius={"xs"} size="xs" />
              <Text className="media-server-name" size="sm">
                {integration.integrationName}
              </Text>
            </Group>
          ))}
        </Group>
      </Group>
    </Stack>
  );
}

const ItemInfoModal = createModal<{ item: StreamSession }>(({ innerProps }) => {
  const t = useScopedI18n("widget.mediaServer.items");
  const Icon = innerProps.item.currentlyPlaying ? mediaTypeIconMap[innerProps.item.currentlyPlaying.type] : null;

  const metadata = useMemo(() => {
    return innerProps.item.currentlyPlaying?.metadata
      ? constructMetadata(innerProps.item.currentlyPlaying.metadata)
      : null;
  }, [innerProps.item.currentlyPlaying?.metadata]);

  return (
    <Stack align="center">
      <Flex direction="column" gap="xs" align="center">
        {Icon && innerProps.item.currentlyPlaying !== null && (
          <Group gap="sm" align="center">
            <Icon size={24} />
            <Title order={2}>{innerProps.item.currentlyPlaying.name}</Title>
          </Group>
        )}
        {innerProps.item.currentlyPlaying?.episodeName && (
          <Group>
            <Title order={4}>{innerProps.item.currentlyPlaying.episodeName}</Title>
            {innerProps.item.currentlyPlaying.seasonName && (
              <>
                {" - "}
                <Title order={4}>{innerProps.item.currentlyPlaying.seasonName}</Title>
              </>
            )}
          </Group>
        )}
      </Flex>
      <NormalizedLine
        itemKey={t("user")}
        value={
          <Group gap="sm" align="center">
            <Avatar size="sm" src={innerProps.item.user.profilePictureUrl} />{" "}
            <Text>{innerProps.item.user.username}</Text>
          </Group>
        }
      />
      <NormalizedLine itemKey={t("name")} value={<Text>{innerProps.item.sessionName}</Text>} />
      <NormalizedLine itemKey={t("id")} value={<Text>{innerProps.item.sessionId}</Text>} />

      {metadata ? (
        <Stack w="100%" gap={0}>
          <Divider label={t("metadata.title")} labelPosition="center" mt="lg" mb="sm" />

          <Group align="flex-start">
            {objectEntries(metadata).map(([key, value], index) => (
              <Fragment key={key}>
                {index !== 0 && <Divider key={index} orientation="vertical" />}
                <Stack gap={4}>
                  <Text fw="bold">{t(`metadata.${key}.title`)}</Text>

                  {Object.entries(value)
                    .filter(([_, value]) => Boolean(value))
                    .map(([innerKey, value]) => (
                      <Group justify="space-between" w="100%" key={innerKey} wrap="nowrap">
                        <Text>{t(`metadata.${key}.${innerKey}` as never)}</Text>
                        <Text>{value}</Text>
                      </Group>
                    ))}
                </Stack>
              </Fragment>
            ))}
          </Group>
        </Stack>
      ) : null}
    </Stack>
  );
}).withOptions({
  defaultTitle() {
    return "";
  },
  size: "lg",
  centered: true,
});

const NormalizedLine = ({ itemKey, value }: { itemKey: string; value: ReactNode }) => {
  return (
    <Group w="100%" align="top" justify="space-between">
      <Text>{itemKey}:</Text>
      {value}
    </Group>
  );
};

const mediaTypeIconMap = {
  movie: IconMovie,
  tv: IconDeviceTv,
  video: IconVideo,
  audio: IconHeadphones,
} satisfies Record<Exclude<StreamSession["currentlyPlaying"], null>["type"], TablerIcon>;

const constructMetadata = (metadata: Exclude<Exclude<StreamSession["currentlyPlaying"], null>["metadata"], null>) => ({
  video: {
    resolution: metadata.video.resolution
      ? `${metadata.video.resolution.width}x${metadata.video.resolution.height}`
      : null,
    frameRate: metadata.video.frameRate,
  },
  audio: {
    channelCount: metadata.audio.channelCount,
    codec: metadata.audio.codec,
  },
  transcoding: {
    container: metadata.transcoding.container,
    resolution: metadata.transcoding.resolution
      ? `${metadata.transcoding.resolution.width}x${metadata.transcoding.resolution.height}`
      : null,
    target: `${metadata.transcoding.target.videoCodec} ${metadata.transcoding.target.audioCodec}`.trim(),
  },
});
