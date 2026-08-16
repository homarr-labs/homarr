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
import { objectEntries } from "@homarr/common";
import { getIconUrl } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import classes from "./component.module.css";

type TranscodingDecision = NonNullable<NonNullable<StreamSession["currentlyPlaying"]>["metadata"]>["transcoding"];

type PlaybackStatus = "directPlay" | "directStream" | "transcodeVideo" | "transcodeAudio" | "transcoding";
type SortColumn = "user" | "currentlyPlaying" | "status";
type SortState = { column: SortColumn; descending: boolean } | null;

export const getMediaServerColumnVisibility = (width: number, isAdvanced: boolean) => ({
  user: isAdvanced || width >= 300,
  status: isAdvanced || width >= 420,
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
  return bitrateKbps >= 1000 ? `${(bitrateKbps / 1000).toFixed(1)} Mbps` : `${Math.round(bitrateKbps)} kbps`;
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
}: {
  column: SortColumn;
  label: string;
  sortable: boolean;
  sort: SortState;
  onSort: (column: SortColumn) => void;
}) {
  const active = sort?.column === column;
  const SortIcon = !active ? IconArrowsSort : sort.descending ? IconChevronDown : IconChevronUp;

  return (
    <Table.Th aria-sort={active ? (sort.descending ? "descending" : "ascending") : "none"}>
      {sortable ? (
        <UnstyledButton className={classes.sortButton} onClick={() => onSort(column)}>
          <Text component="span" size="xs" fw={600} truncate>
            {label}
          </Text>
          <SortIcon size="var(--mantine-font-size-xs)" aria-hidden />
        </UnstyledButton>
      ) : (
        <Text size="xs" fw={600} truncate>
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
  height,
  isEditMode,
  displayMode,
}: WidgetComponentProps<"mediaServer">) {
  const currentStreamsQuery = clientApi.widget.mediaServer.getCurrentStreams.useQuery({
    integrationIds,
    showOnlyPlaying: options.showOnlyPlaying,
  });
  const currentStreamsData = getUsableWidgetQueryData(currentStreamsQuery);
  const currentStreams = useMemo(() => currentStreamsData ?? [], [currentStreamsData]);

  const t = useScopedI18n("widget.mediaServer");
  const tGlobal = useI18n();
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

  const uniqueIntegrations = currentStreams.map((stream) => ({
    integrationId: stream.integrationId,
    integrationKind: stream.integrationKind,
    integrationIcon: getIconUrl(stream.integrationKind),
    integrationName: stream.integrationName,
  }));

  const playingCount = flatSessions.filter(
    (session) => session.currentlyPlaying && session.currentlyPlaying.playback?.state !== "paused",
  ).length;
  const transcodingCount = flatSessions.filter((session) => {
    const status = getPlaybackStatus(session.currentlyPlaying?.metadata?.transcoding);
    return status !== "directPlay" && status !== "directStream";
  }).length;

  const totalBitrateKbps = flatSessions.reduce(
    (sum, session) => sum + (session.currentlyPlaying?.metadata?.bitrateKbps ?? 0),
    0,
  );
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
              placeholder={tGlobal("search.placeholder")}
              aria-label={tGlobal("search.placeholder")}
              leftSection={<IconSearch size="var(--mantine-font-size-xs)" aria-hidden />}
            />
            <WidgetQueryErrorIndicator error={currentStreamsQuery.error} label={t("name")} />
            <IntegrationErrorIndicator results={currentStreams} />
          </Group>
        </Group>
      )}
      {!isAdvanced && (hasFailedIntegrations || currentStreamsQuery.error) && (
        <Group px="xs" justify="flex-end">
          <WidgetQueryErrorIndicator error={currentStreamsQuery.error} label={t("name")} />
          <IntegrationErrorIndicator results={currentStreams} />
        </Group>
      )}
      <div
        className={classes.tableViewport}
        data-media-server-streams
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
                        <Avatar size={28} src={session.user?.profilePictureUrl} />
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
                          <Badge size="xs" variant="light" color={playbackStatusColorMap[status]}>
                            {t(`items.${status}` as never)}
                          </Badge>
                          {(location ?? bitrateLabel) && (
                            <Group gap={4} align="center" justify="space-between" wrap="nowrap" w="100%">
                              <Group gap={4} align="center" wrap="nowrap">
                                {location &&
                                  (location === "lan" ? (
                                    <IconWifi size="var(--mantine-font-size-xs)" />
                                  ) : (
                                    <IconWorld size="var(--mantine-font-size-xs)" />
                                  ))}
                                {location && (
                                  <Text size="xs" c="dimmed" tt="uppercase">
                                    {location}
                                  </Text>
                                )}
                              </Group>
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
      </div>
      {(isAdvanced || height >= 144) && (
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
            <IconVideo size="var(--mantine-font-size-xs)" style={{ flexShrink: 0 }} />
            <Text size="sm" style={{ whiteSpace: "nowrap" }}>
              {(t as unknown as (key: string, params?: { count: number }) => string)("footer.streams", {
                count: flatSessions.length,
              })}
            </Text>
            {totalBitrateLabel && (isAdvanced || width >= 300) && (
              <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {t("footer.totalBitrate", { bitrate: totalBitrateLabel })}
              </Text>
            )}
          </Group>
          <Group gap="xs">
            {uniqueIntegrations.map((integration) => (
              <Group key={integration.integrationId} gap="xs" align="center">
                <Avatar className="media-server-icon" src={integration.integrationIcon} radius={"xs"} size="xs" />
                {(isAdvanced || width >= 480) && (
                  <Text className="media-server-name" size="sm" truncate="end">
                    {integration.integrationName}
                  </Text>
                )}
              </Group>
            ))}
          </Group>
        </Group>
      )}
    </Stack>
  );
}

function CurrentlyPlaying({ item }: { item: StreamSession }) {
  const t = useScopedI18n("widget.mediaServer");
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
  const seasonNumber = currentlyPlaying.seasonName?.match(/\d+/)?.[0];
  const episodeNumber = currentlyPlaying.episodeCount;
  const seasonEpisodeLabel =
    seasonNumber !== undefined && episodeNumber !== undefined && episodeNumber !== null
      ? `S${seasonNumber.padStart(2, "0")} E${String(episodeNumber).padStart(2, "0")}`
      : null;

  return (
    <Stack gap={6} style={{ minWidth: 0 }}>
      <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
        <Icon size="var(--mantine-font-size-xs)" color={isPaused ? "var(--mantine-color-yellow-6)" : undefined} style={{ flexShrink: 0 }} />
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
      width="min(26.25rem, calc(100vw - 1.5rem))"
      shadow="md"
      withArrow
      withinPortal
      returnFocus
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
      <Popover.Dropdown>
        <SessionDetails item={item} />
      </Popover.Dropdown>
    </Popover>
  );
}

function SessionDetails({ item }: { item: StreamSession }) {
  const t = useScopedI18n("widget.mediaServer.items");
  const Icon = item.currentlyPlaying ? mediaTypeIconMap[item.currentlyPlaying.type] : null;

  const metadata = item.currentlyPlaying?.metadata ? constructMetadata(item.currentlyPlaying.metadata) : null;

  return (
    <Stack gap="sm" style={{ minWidth: 0 }}>
      {Icon && item.currentlyPlaying && (
        <Group gap="sm" align="flex-start" wrap="nowrap">
          <Icon size={22} style={{ flexShrink: 0 }} />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} lineClamp={2}>
              {item.currentlyPlaying.name}
            </Text>
            {item.currentlyPlaying.episodeName && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {[item.currentlyPlaying.episodeName, item.currentlyPlaying.seasonName].filter(Boolean).join(" · ")}
              </Text>
            )}
          </Stack>
        </Group>
      )}
      <NormalizedLine
        itemKey={t("user")}
        value={
          <Group gap="xs" align="center" wrap="nowrap">
            <Avatar size="xs" src={item.user?.profilePictureUrl} />
            <Text size="sm" truncate>
              {item.user?.username ?? t("unknownUser")}
            </Text>
          </Group>
        }
      />
      <NormalizedLine
        itemKey={t("name")}
        value={
          <Text size="sm" truncate>
            {item.sessionName}
          </Text>
        }
      />
      <NormalizedLine
        itemKey={t("id")}
        value={
          <Text size="xs" ff="monospace" truncate>
            {item.sessionId}
          </Text>
        }
      />

      {metadata ? (
        <Stack gap="xs">
          <Divider label={t("metadata.title")} labelPosition="left" />
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm" verticalSpacing="xs">
            {objectEntries(metadata).map(([key, entries]) => (
              <Stack key={key} gap={4} style={{ minWidth: 0 }}>
                <Text fw={600} size="xs">
                  {t(`metadata.${key}.title`)}
                </Text>
                {Object.entries(entries)
                  .filter(([_, entryValue]) => Boolean(entryValue))
                  .map(([innerKey, entryValue]) => (
                    <Group justify="space-between" gap="xs" key={innerKey} wrap="nowrap">
                      <Text size="xs" c="dimmed">
                        {t(`metadata.${key}.${innerKey}` as never)}
                      </Text>
                      <Text size="xs" ta="right" truncate>
                        {entryValue}
                      </Text>
                    </Group>
                  ))}
              </Stack>
            ))}
          </SimpleGrid>
        </Stack>
      ) : null}
    </Stack>
  );
}

const NormalizedLine = ({ itemKey, value }: { itemKey: string; value: ReactNode }) => {
  return (
    <Group w="100%" gap="md" align="flex-start" justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {itemKey}:
      </Text>
      <Stack gap={0} align="flex-end" style={{ minWidth: 0 }}>
        {value}
      </Stack>
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
