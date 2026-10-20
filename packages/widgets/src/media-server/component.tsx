"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Divider,
  Group,
  Popover,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
  IconDeviceTv,
  IconHeadphones,
  IconMovie,
  IconPlayerPause,
  IconSearch,
  IconVideo,
  IconWifi,
  IconWorld,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatBitRate } from "@homarr/common";
import { getIconUrl } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import classes from "./component.module.css";

type TranscodingDecision = NonNullable<NonNullable<StreamSession["currentlyPlaying"]>["metadata"]>["transcoding"];

type PlaybackStatus = "directPlay" | "directStream" | "transcodeVideo" | "transcodeAudio" | "transcoding";
type SortColumn = "user" | "currentlyPlaying" | "status";
type SortState = { column: SortColumn; descending: boolean } | null;

export const getMediaServerColumnVisibility = (_width: number, _isAdvanced: boolean) => ({
  user: true,
  status: true,
});

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
  return formatBitRate(bitrateKbps * 1000);
}

const RESOLUTION_TIER_HEIGHTS = [4320, 2160, 1440, 1080, 720, 480, 360, 240] as const;

export function getResolutionLabel(width: number, height: number): string {
  // Classify off the short axis (height for landscape, width for portrait) so orientation
  // doesn't flip which dimension drives the label. Letterboxed/cinemascope sources are cropped
  // shorter than their nominal resolution class (a 1920x804 encode is still "1080p"), so derive
  // a floor for the short axis from the long axis assuming 16:9 - matches how Plex/Jellyfin label these themselves.
  const isPortrait = height > width;
  const shortAxis = isPortrait ? width : height;
  const longAxis = isPortrait ? height : width;
  const effectiveShortAxis = Math.max(shortAxis, Math.round((longAxis * 9) / 16));
  const tier = RESOLUTION_TIER_HEIGHTS.find((candidate) => effectiveShortAxis >= candidate * 0.9);
  return `${tier ?? effectiveShortAxis}p`;
}

export function getSeasonEpisodeParams(
  seasonNumber: number | null | undefined,
  episodeNumber: number | null | undefined,
): { season: string; episode: string } | null {
  if (seasonNumber === null || seasonNumber === undefined || episodeNumber === null || episodeNumber === undefined) {
    return null;
  }
  return { season: String(seasonNumber).padStart(2, "0"), episode: String(episodeNumber).padStart(2, "0") };
}

const getSessionSortValue = (session: StreamSession, column: SortColumn) => {
  if (column === "user") return session.user?.username ?? session.sessionName;
  if (column === "currentlyPlaying") return session.currentlyPlaying?.name ?? session.sessionName;
  return getPlaybackStatus(session.currentlyPlaying?.metadata?.transcoding);
};

const filterAndSortSessions = <T extends StreamSession>(sessions: T[], query: string, sort: SortState): T[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = normalizedQuery
    ? sessions.filter((session) =>
        [session.user?.username, session.sessionName, session.currentlyPlaying?.name]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
      )
    : sessions;

  if (!sort) return filtered;

  return filtered.toSorted((left, right) => {
    const comparison = getSessionSortValue(left, sort.column).localeCompare(getSessionSortValue(right, sort.column));
    return sort.descending ? -comparison : comparison;
  });
};

function StreamTableHeader({
  column,
  label,
  sortable,
  sort,
  onSort,
  width,
}: {
  column: SortColumn;
  label: string;
  sortable: boolean;
  sort: SortState;
  onSort: (column: SortColumn) => void;
  width?: number | string;
}) {
  const active = sort?.column === column;
  const SortIcon = !active ? IconArrowsSort : sort.descending ? IconChevronDown : IconChevronUp;

  return (
    <Table.Th style={{ width }} aria-sort={active ? (sort.descending ? "descending" : "ascending") : "none"}>
      {sortable ? (
        <UnstyledButton className={classes.sortButton} onClick={() => onSort(column)}>
          <Text component="span" size="xs" fw={600} c="dimmed" style={{ letterSpacing: "0.02em" }} truncate>
            {label}
          </Text>
          <SortIcon
            size="var(--mantine-font-size-xs)"
            aria-hidden
            color={active ? undefined : "var(--mantine-color-dimmed)"}
          />
        </UnstyledButton>
      ) : (
        <Text size="xs" fw={600} c="dimmed" style={{ letterSpacing: "0.02em" }} truncate>
          {label}
        </Text>
      )}
    </Table.Th>
  );
}

export default function MediaServerWidget({
  options,
  integrationIds,
  width,
  isEditMode,
  displayMode,
}: WidgetComponentProps<"mediaServer">) {
  const currentStreamsQuery = clientApi.widget.mediaServer.getCurrentStreams.useQuery({
    integrationIds,
    showOnlyPlaying: options.showOnlyPlaying,
  });
  const currentStreamsData = getUsableWidgetQueryData(currentStreamsQuery);
  const currentStreams = useMemo(() => currentStreamsData ?? [], [currentStreamsData]);

  const t = useI18n("widget.mediaServer");
  const tSearch = useI18n("search");
  const isAdvanced = displayMode === "advanced";
  const showLocation = isAdvanced || options.showLocation;
  const showBitrate = isAdvanced || options.showBitrate;
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const columnVisibility = getMediaServerColumnVisibility(width, isAdvanced);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>(null);

  // Only render the flat list of sessions when the currentStreams change
  // Otherwise it will always create a new array reference and cause the table to re-render
  const flatSessions = useMemo(
    () =>
      currentStreams.flatMap((pair) =>
        pair.sessions.map((session) => ({
          ...session,
          integrationId: pair.integrationId,
          integrationKind: pair.integrationKind,
          integrationName: pair.integrationName,
          integrationIcon: getIconUrl(pair.integrationKind),
        })),
      ),
    [currentStreams],
  );
  const visibleSessions = useMemo(
    () => filterAndSortSessions(flatSessions, isAdvanced ? search : "", isAdvanced ? sort : null),
    [flatSessions, isAdvanced, search, sort],
  );

  const toggleSort = (column: SortColumn) =>
    setSort((current) =>
      current?.column === column ? { column, descending: !current.descending } : { column, descending: false },
    );

  const uniqueIntegrations = currentStreams
    .filter((stream) => stream.sessions.length > 0)
    .map((stream) => ({
      integrationId: stream.integrationId,
      integrationKind: stream.integrationKind,
      integrationIcon: getIconUrl(stream.integrationKind),
      integrationName: stream.integrationName,
    }));

  let playingCount = 0;
  let transcodingCount = 0;
  let totalBitrateKbps = 0;
  if (isAdvanced || showBitrate) {
    for (const session of flatSessions) {
      const playing = session.currentlyPlaying;
      if (isAdvanced) {
        if (playing && playing.playback?.state !== "paused") playingCount++;
        const status = getPlaybackStatus(playing?.metadata?.transcoding);
        if (status !== "directPlay" && status !== "directStream") transcodingCount++;
      }
      if (showBitrate) totalBitrateKbps += playing?.metadata?.bitrateKbps ?? 0;
    }
  }
  const totalBitrateLabel = showBitrate ? formatBitrate(totalBitrateKbps) : null;
  const hasFailedIntegrations = currentStreams.some(({ error }) => Boolean(error));

  return (
    <Stack className={classes.root} gap={0} h="100%" display="flex">
      {isAdvanced && (
        <Group px="xs" py={4} gap="xs">
          <Badge variant="light">{t("summary.sessions", { count: flatSessions.length })}</Badge>
          <Badge variant="light" color="green">
            {t("summary.playing", { count: playingCount })}
          </Badge>
          <Badge variant="light" color="orange">
            {t("summary.transcoding", { count: transcodingCount })}
          </Badge>
          <Group ml="auto">
            <TextInput
              size="xs"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder={tSearch("placeholder")}
              aria-label={tSearch("placeholder")}
              leftSection={<IconSearch size="var(--mantine-font-size-xs)" aria-hidden />}
            />
            <IntegrationErrorIndicator results={currentStreams} />
          </Group>
        </Group>
      )}
      {!isAdvanced && hasFailedIntegrations && (
        <Group px="xs" justify="flex-end">
          <IntegrationErrorIndicator results={currentStreams} />
        </Group>
      )}
      <ScrollArea
        className={classes.tableViewport}
        data-media-server-streams
        scrollbars="xy"
        style={{ pointerEvents: isEditMode ? "none" : undefined }}
      >
        <Table stickyHeader highlightOnHover={!isEditMode} layout="fixed" className="media-server-widget-table">
          <Table.Thead>
            <Table.Tr>
              {columnVisibility.user && (
                <StreamTableHeader
                  column="user"
                  label={t("items.user")}
                  sortable={isAdvanced}
                  sort={sort}
                  onSort={toggleSort}
                  width="26%"
                />
              )}
              <StreamTableHeader
                column="currentlyPlaying"
                label={t("items.currentlyPlaying")}
                sortable={isAdvanced}
                sort={sort}
                onSort={toggleSort}
              />
              {columnVisibility.status && (
                <StreamTableHeader
                  column="status"
                  label={t("items.status")}
                  sortable={isAdvanced}
                  sort={sort}
                  onSort={toggleSort}
                  width="22%"
                />
              )}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleSessions.map((session) => {
              const rowId = `${session.integrationId}:${session.sessionId}`;
              const currentlyPlaying = session.currentlyPlaying;
              const status = getPlaybackStatus(currentlyPlaying?.metadata?.transcoding);
              const location = showLocation ? currentlyPlaying?.location : null;
              const bitrateLabel = showBitrate ? formatBitrate(currentlyPlaying?.metadata?.bitrateKbps) : null;
              // The transcoding resolution reflects what's actually being streamed - fall back to the
              // source's own resolution when it isn't set (direct play, or a transcode that only
              // touches audio/container and leaves the video resolution untouched).
              const resolution =
                currentlyPlaying?.metadata?.transcoding.resolution ?? currentlyPlaying?.metadata?.video.resolution;
              const resolutionLabel = resolution ? getResolutionLabel(resolution.width, resolution.height) : null;
              const toggleDetails = () => setSelectedRowId((current) => (current === rowId ? null : rowId));

              return (
                <Table.Tr
                  key={rowId}
                  className={isEditMode ? undefined : classes.sessionRow}
                  tabIndex={isEditMode ? -1 : 0}
                  aria-label={session.sessionName}
                  aria-haspopup={isEditMode ? undefined : "dialog"}
                  aria-expanded={isEditMode ? undefined : selectedRowId === rowId}
                  onClick={isEditMode ? undefined : toggleDetails}
                  onKeyDown={
                    isEditMode
                      ? undefined
                      : (event) => {
                          if (event.currentTarget !== event.target) return;
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          toggleDetails();
                        }
                  }
                >
                  {columnVisibility.user && (
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap" w="100%">
                        <Avatar size={28} src={session.user?.profilePictureUrl} style={{ flexShrink: 0 }} />
                        <Stack gap={2} className={classes.cellContent}>
                          <Text size="xs" truncate>
                            {session.user?.username ?? t("items.unknownUser")}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {session.sessionName}
                          </Text>
                        </Stack>
                      </Group>
                    </Table.Td>
                  )}
                  <Table.Td>
                    <SessionDetailsPopover
                      item={session}
                      opened={selectedRowId === rowId}
                      onChange={(opened) => setSelectedRowId(opened ? rowId : null)}
                    >
                      <CurrentlyPlaying item={session} />
                    </SessionDetailsPopover>
                  </Table.Td>
                  {columnVisibility.status && (
                    <Table.Td>
                      {currentlyPlaying && (
                        <Stack gap={4} align="flex-start" w="100%" className={classes.cellContent}>
                          <Group gap={4} align="center" justify="space-between" wrap="nowrap" w="100%">
                            <Badge size="xs" variant="light" color={playbackStatusColorMap[status]}>
                              {t(`items.${status}` as never)}
                            </Badge>
                            {location && (
                              <Group gap={4} align="center" wrap="nowrap">
                                {location === "lan" ? (
                                  <IconWifi size="var(--mantine-font-size-xs)" />
                                ) : (
                                  <IconWorld size="var(--mantine-font-size-xs)" />
                                )}
                                <Text size="xs" c="dimmed" tt="uppercase">
                                  {location}
                                </Text>
                              </Group>
                            )}
                          </Group>
                          {(resolutionLabel ?? bitrateLabel) && (
                            <Group gap={4} align="center" justify="space-between" wrap="nowrap" w="100%">
                              {resolutionLabel && (
                                <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                                  {resolutionLabel}
                                </Text>
                              )}
                              {bitrateLabel && (
                                <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                                  {bitrateLabel}
                                </Text>
                              )}
                            </Group>
                          )}
                        </Stack>
                      )}
                    </Table.Td>
                  )}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
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
        <Group gap={isAdvanced ? 6 : 4} wrap="nowrap">
          <IconVideo
            size={isAdvanced ? "var(--mantine-font-size-xs)" : undefined}
            style={isAdvanced ? { flexShrink: 0 } : zoomCompensatedSize(16)}
          />
          <Text size="sm" fw={isAdvanced ? 500 : undefined} style={{ whiteSpace: "nowrap" }}>
            {t("footer.streams", { count: flatSessions.length })}
          </Text>
          {totalBitrateLabel && (
            <>
              {isAdvanced && (
                <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                  •
                </Text>
              )}
              <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {t("footer.totalBitrate", { bitrate: totalBitrateLabel })}
              </Text>
            </>
          )}
        </Group>
        <Group gap={isAdvanced ? 6 : "xs"} wrap="nowrap">
          {uniqueIntegrations.map((integration) => (
            <Group
              key={integration.integrationId}
              gap={isAdvanced ? 6 : "xs"}
              align="center"
              wrap="nowrap"
              pl={isAdvanced ? 2 : undefined}
              pr={isAdvanced ? 8 : undefined}
              py={isAdvanced ? 2 : undefined}
              style={
                isAdvanced
                  ? {
                      backgroundColor: "var(--mantine-color-default-hover)",
                      borderRadius: 999,
                    }
                  : undefined
              }
            >
              <Avatar
                className="media-server-icon"
                src={integration.integrationIcon}
                radius={isAdvanced ? "xl" : "xs"}
                size={isAdvanced ? 18 : "xs"}
              />
              <Text
                className="media-server-name"
                size={isAdvanced ? "xs" : "sm"}
                fw={isAdvanced ? 500 : undefined}
                truncate={isAdvanced ? "end" : undefined}
              >
                {integration.integrationName}
              </Text>
            </Group>
          ))}
        </Group>
      </Group>
    </Stack>
  );
}

function CurrentlyPlaying({ item }: { item: StreamSession }) {
  const t = useI18n("widget.mediaServer");
  const currentlyPlaying = item.currentlyPlaying;
  if (!currentlyPlaying) {
    return (
      <Text size="xs" c="dimmed">
        {item.sessionName}
      </Text>
    );
  }

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
  const seasonEpisodeParams = getSeasonEpisodeParams(currentlyPlaying.seasonNumber, currentlyPlaying.episodeNumber);
  const seasonEpisodeLabel = seasonEpisodeParams ? t("items.seasonEpisode", seasonEpisodeParams) : null;

  return (
    <Stack gap={6} style={{ minWidth: 0 }}>
      <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
        <Icon
          size="var(--mantine-font-size-xs)"
          color={isPaused ? "var(--mantine-color-yellow-6)" : undefined}
          style={{ flexShrink: 0 }}
        />
        <Text size="xs" lineClamp={1} style={{ minWidth: 0 }}>
          {currentlyPlaying.name}
        </Text>
        {seasonEpisodeLabel && (
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {seasonEpisodeLabel}
          </Text>
        )}
        {isPaused ? (
          <Text size="xs" c="yellow" style={{ flexShrink: 0 }}>
            {t("items.paused")}
          </Text>
        ) : (
          remainingMinutes !== null && (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {t("items.remaining", { minutes: remainingMinutes.toString() })}
            </Text>
          )
        )}
      </Group>
      {progressPercent !== null && (
        <Progress
          value={progressPercent}
          size={4}
          color={isPaused ? "yellow" : "green"}
          style={{ backgroundColor: "var(--mantine-color-default-border)" }}
        />
      )}
    </Stack>
  );
}

export function SessionDetailsPopover({
  item,
  opened,
  onChange,
  children,
}: {
  item: StreamSession;
  opened: boolean;
  onChange: (opened: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Popover
      opened={opened}
      onChange={onChange}
      position="bottom-start"
      width="min(26rem, calc(100vw - 1.5rem))"
      shadow="md"
      withArrow
      withinPortal
      returnFocus
      middlewares={{ flip: true, shift: { padding: 8 } }}
    >
      <Popover.Target>
        <UnstyledButton
          className={classes.detailsTarget}
          aria-label={item.sessionName}
          onClick={(event) => {
            event.stopPropagation();
            onChange(!opened);
          }}
        >
          {children}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p="sm" style={{ maxHeight: "calc(100vh - 1.5rem)", overflowY: "auto" }}>
        <SessionDetails item={item} />
      </Popover.Dropdown>
    </Popover>
  );
}

export const formatPlaybackTime = (ms: number | null | undefined): string | null => {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
  return `${minutes}:${seconds}`;
};

export const formatChannelLayout = (channelCount: number | null | undefined): string | null => {
  if (!channelCount || channelCount <= 0) return null;
  if (channelCount === 6) return "5.1";
  if (channelCount === 8) return "7.1";
  return `${channelCount}.0`;
};

export const formatFrameRate = (frameRate: number | null | undefined): string | null => {
  if (!frameRate || !Number.isFinite(frameRate) || frameRate <= 0) return null;
  return `${Number(frameRate.toFixed(3))} fps`;
};

export const formatCodec = (codec: string | null | undefined): string | null => (codec ? codec.toUpperCase() : null);

const formatResolution = (resolution: { width: number; height: number } | null | undefined): string | null => {
  if (!resolution) return null;
  return `${resolution.width}×${resolution.height} (${getResolutionLabel(resolution.width, resolution.height)})`;
};

interface DetailEntry {
  key: string;
  label: string;
  value: ReactNode;
  fullWidth: boolean;
}

const createEntry = (
  key: string,
  label: string,
  value: ReactNode | null | undefined,
  fullWidth = false,
): DetailEntry | null =>
  value === null || value === undefined || value === "" ? null : { key, label, value, fullWidth };

const DetailGrid = ({ entries }: { entries: (DetailEntry | null)[] }) => {
  const visible = entries.filter((entry): entry is DetailEntry => entry !== null);
  if (visible.length === 0) return null;

  return (
    <SimpleGrid cols={3} spacing="xs" verticalSpacing={6}>
      {visible.map((entry) => (
        <Stack key={entry.key} gap={0} style={{ minWidth: 0, gridColumn: entry.fullWidth ? "1 / -1" : undefined }}>
          <Text fz={11} c="dimmed" truncate>
            {entry.label}
          </Text>
          <Text component="div" size="xs" fw={500} truncate>
            {entry.value}
          </Text>
        </Stack>
      ))}
    </SimpleGrid>
  );
};

function SessionDetails({ item }: { item: StreamSession }) {
  const t = useI18n("widget.mediaServer.items");
  const playing = item.currentlyPlaying;
  const Icon = playing ? mediaTypeIconMap[playing.type] : null;
  const metadata = playing?.metadata ?? null;
  const transcoding = metadata?.transcoding;
  const status = playing ? getPlaybackStatus(transcoding) : null;
  const playbackState = playing?.playback?.state ?? null;
  let playbackStateLabel: string | null = null;
  if (playbackState === "paused") {
    playbackStateLabel = t("paused");
  } else if (playbackState) {
    playbackStateLabel = t(`state.${playbackState}`);
  }
  const positionMs = playing?.playback?.positionMs ?? null;
  const durationMs = playing?.playback?.durationMs ?? null;
  const progress =
    positionMs !== null && durationMs !== null && durationMs > 0
      ? Math.min(100, (positionMs / durationMs) * 100)
      : null;
  const position = formatPlaybackTime(positionMs);
  const duration = formatPlaybackTime(durationMs);
  const remainingMinutes =
    positionMs !== null && durationMs !== null ? Math.max(0, Math.round((durationMs - positionMs) / 60_000)) : null;
  const seasonEpisode = playing ? getSeasonEpisodeParams(playing.seasonNumber, playing.episodeNumber) : null;
  let subtitle = "";
  if (playing) {
    const parts = seasonEpisode
      ? [t("seasonEpisode", seasonEpisode), playing.episodeName]
      : [playing.episodeName, playing.seasonName, playing.albumName];
    subtitle = parts.filter(Boolean).join(" · ");
  }

  let videoHandling: string | null = null;
  let audioHandling: string | null = null;
  if (transcoding) {
    const videoTarget = [formatCodec(transcoding.target.videoCodec), formatResolution(transcoding.resolution)]
      .filter(Boolean)
      .join(" · ");
    videoHandling = transcoding.isVideoDirect
      ? t("details.direct")
      : t("details.transcode", { target: videoTarget || t("details.unknown") });
    audioHandling = transcoding.isAudioDirect
      ? t("details.direct")
      : t("details.transcode", { target: formatCodec(transcoding.target.audioCodec) ?? t("details.unknown") });
  }

  let container: string | null = null;
  if (transcoding?.container) {
    const containerName = transcoding.container.toUpperCase();
    container = transcoding.containerChanged
      ? t("details.containerChanged", { container: containerName })
      : containerName;
  }
  const location = playing?.location?.toUpperCase() ?? null;
  const audioFormat = metadata
    ? [formatCodec(metadata.audio.codec), formatChannelLayout(metadata.audio.channelCount)].filter(Boolean).join(" ")
    : "";

  return (
    <Stack gap={8} style={{ minWidth: 0 }}>
      {Icon && playing && (
        <Stack gap={6} style={{ minWidth: 0 }}>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Icon size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
              <Text fw={600} size="sm" lineClamp={1}>
                {playing.name}
              </Text>
              {subtitle && (
                <Text fz={11} c="dimmed" lineClamp={1}>
                  {subtitle}
                </Text>
              )}
            </Stack>
            {status && (
              <Badge size="xs" variant="light" color={playbackStatusColorMap[status]} style={{ flexShrink: 0 }}>
                {t(status)}
              </Badge>
            )}
          </Group>
          {progress !== null && (
            <Stack gap={2}>
              <Progress value={progress} size={4} color={playbackState === "paused" ? "yellow" : undefined} />
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Text fz={11} c="dimmed">
                  {position && duration ? t("details.position", { position, duration }) : null}
                </Text>
                <Text fz={11} c="dimmed">
                  {[
                    playbackStateLabel,
                    remainingMinutes !== null ? t("remaining", { minutes: remainingMinutes.toString() }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Group>
            </Stack>
          )}
        </Stack>
      )}
      <Divider />
      <DetailGrid
        entries={[
          createEntry(
            "user",
            t("user"),
            <Group gap={6} align="center" wrap="nowrap">
              <Avatar size={16} src={item.user?.profilePictureUrl} />
              <Text size="xs" fw={500} truncate>
                {item.user?.username ?? t("unknownUser")}
              </Text>
            </Group>,
          ),
          createEntry("device", t("details.device"), item.sessionName),
          createEntry("location", t("details.location"), location),
          createEntry(
            "resolution",
            t("metadata.video.resolution"),
            metadata ? formatResolution(metadata.video.resolution) : null,
          ),
          createEntry(
            "frameRate",
            t("metadata.video.frameRate"),
            metadata ? formatFrameRate(metadata.video.frameRate) : null,
          ),
          createEntry("bitrate", t("details.bitrate"), metadata ? formatBitrate(metadata.bitrateKbps) : null),
          createEntry("video", t("metadata.video.title"), videoHandling),
          createEntry("audio", t("metadata.audio.title"), audioFormat),
          createEntry("audioHandling", t("details.audioHandling"), audioHandling),
          createEntry("container", t("metadata.transcoding.container"), container),
          createEntry(
            "id",
            t("details.sessionId"),
            <Text component="span" fz={11} ff="monospace" truncate>
              {item.sessionId}
            </Text>,
            true,
          ),
        ]}
      />
    </Stack>
  );
}

const mediaTypeIconMap = {
  movie: IconMovie,
  tv: IconDeviceTv,
  video: IconVideo,
  audio: IconHeadphones,
} satisfies Record<Exclude<StreamSession["currentlyPlaying"], null>["type"], TablerIcon>;
