"use client";
import { definition } from ".";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Center,
  Group,
  Image,
  Paper,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { IconBook, IconDownload, IconMovie, IconQuestionMark, IconVideo } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import type { MissingMediaItem, QueuedMediaItem } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getUsableWidgetQueryData } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import classes from "./component.module.css";
import type { MediaMissingTab } from "./tabs";
import { resolveMediaMissingTab } from "./tabs";

const MIN_CARD_WIDTH = 280;
const MAX_COLUMNS = 4;
const GRID_HORIZONTAL_PADDING = 20;
const GRID_COLUMN_GAP = 10;

const columnBreakpoints = Array.from({ length: MAX_COLUMNS }, (_, index) => {
  const columns = MAX_COLUMNS - index;
  return {
    columns,
    minimumWidth: columns * MIN_CARD_WIDTH + (columns - 1) * GRID_COLUMN_GAP,
  };
});

const getMediaMissingGridLayout = (panelWidth: number) => {
  const contentWidth = Math.max(0, panelWidth - GRID_HORIZONTAL_PADDING);
  const breakpoint = columnBreakpoints.find((candidate) => contentWidth >= candidate.minimumWidth);
  return { columns: breakpoint?.columns ?? 1, contentWidth };
};

export default function MediaMissingWidget({
  integrationIds,
  options,
  width,
  displayMode,
  widgetRuntimeRef,
}: WidgetComponentProps<"mediaMissing">) {
  const t = useI18n("widget.mediaMissing");
  const isAdvanced = displayMode === "advanced";
  const showMissing = isAdvanced || options.showMissing;
  const showQueued = isAdvanced || options.showQueued;
  const input = definition.data.queries({ options, integrationIds, displayMode }).main.input;
  useWidgetRuntimeQueries(widgetRuntimeRef, [getQueryKey(clientApi.widget.mediaOrganizer.getData, input, "query")]);
  const mediaQuery = clientApi.widget.mediaOrganizer.getData.useQuery(input, {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const data = getUsableWidgetQueryData(mediaQuery);
  const [selectedTab, setSelectedTab] = useState<MediaMissingTab>(showMissing ? "missing" : "queued");
  const tabScrollPositionsRef = useRef<Record<MediaMissingTab, { x: number; y: number }>>({
    missing: { x: 0, y: 0 },
    queued: { x: 0, y: 0 },
  });
  const activeTab = resolveMediaMissingTab(selectedTab, showMissing, showQueued);

  useEffect(() => {
    if (activeTab !== null && activeTab !== selectedTab) setSelectedTab(activeTab);
  }, [activeTab, selectedTab]);

  const enabledPanelCount = Number(showMissing) + Number(showQueued);
  const panelWidth = isAdvanced && enabledPanelCount > 1 ? width / enabledPanelCount : width;
  const gridLayout = useMemo(() => getMediaMissingGridLayout(panelWidth), [panelWidth]);

  if (!data) return <WidgetEmptyState />;
  if (data.length === 0) throw new NoIntegrationDataError();
  if (!showMissing && !showQueued)
    return (
      <Center h="100%" p="sm">
        <Text c="dimmed" size="sm" ta="center">
          {t("empty.noTabsEnabled")}
        </Text>
      </Center>
    );

  const missing = data.flatMap((entry) => entry.missing.map((item) => ({ item, integrationId: entry.integrationId })));
  const queued = data.flatMap((entry) => entry.queued.map((item) => ({ item, integrationId: entry.integrationId })));
  const missingCount = data.reduce((sum, entry) => sum + entry.missingCount, 0);
  const queuedCount = data.reduce((sum, entry) => sum + entry.queuedCount, 0);
  const failedIntegrations = data.filter((entry): entry is typeof entry & { error: string } => Boolean(entry.error));

  const renderPanel = (
    tab: MediaMissingTab,
    entries: { item: MissingMediaItem | QueuedMediaItem; integrationId: string }[],
    emptyLabel: string,
  ) => (
    <ScrollArea
      h="100%"
      startScrollPosition={tabScrollPositionsRef.current[tab]}
      onScrollPositionChange={(position) => {
        tabScrollPositionsRef.current[tab] = position;
      }}
    >
      <Box p="xs">
        {entries.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            {emptyLabel}
          </Text>
        ) : (
          <SimpleGrid
            className={classes.grid}
            style={{ "--mm-entries": Math.min(MAX_COLUMNS, entries.length) } as CSSProperties}
            cols={Math.min(gridLayout.columns, entries.length)}
            spacing="xs"
            verticalSpacing="xs"
          >
            {entries.map(({ item, integrationId }) => (
              <MediaCard key={`${integrationId}-${item.type}-${item.id}`} item={item} showQueueDetails={isAdvanced} />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </ScrollArea>
  );

  const partialFailures = failedIntegrations.length > 0 && (
    <Group gap={4} p={4} wrap="wrap">
      {failedIntegrations.map((entry) => (
        <Tooltip key={entry.integrationId} label={`${entry.integrationName}: ${t("name")}`}>
          <Badge size="xs" color="red" variant="light">
            {entry.integrationName}
          </Badge>
        </Tooltip>
      ))}
    </Group>
  );
  if (isAdvanced) {
    return (
      <Stack h="100%" gap={0}>
        {partialFailures}
        <SimpleGrid cols={enabledPanelCount} spacing="sm" p="sm" style={{ flex: 1, minHeight: 0 }}>
          {showMissing && (
            <Paper
              className={classes.panel}
              data-mm-advanced=""
              withBorder
              radius="sm"
              style={{ minHeight: 0, overflow: "hidden" }}
            >
              <Group p="xs" gap="xs">
                <IconQuestionMark size="var(--mantine-font-size-md)" />
                <Text size="sm" fw={600}>
                  <TabTitle label={t("tab.missing")} shown={missing.length} total={missingCount} />
                </Text>
              </Group>
              <Box h="calc(100% - 40px)">{renderPanel("missing", missing, t("empty.missing"))}</Box>
            </Paper>
          )}
          {showQueued && (
            <Paper
              className={classes.panel}
              data-mm-advanced=""
              withBorder
              radius="sm"
              style={{ minHeight: 0, overflow: "hidden" }}
            >
              <Group p="xs" gap="xs">
                <IconDownload size="var(--mantine-font-size-md)" />
                <Text size="sm" fw={600}>
                  <TabTitle label={t("tab.queued")} shown={queued.length} total={queuedCount} />
                </Text>
              </Group>
              <Box h="calc(100% - 40px)">{renderPanel("queued", queued, t("empty.queued"))}</Box>
            </Paper>
          )}
        </SimpleGrid>
      </Stack>
    );
  }

  return (
    <Tabs
      className={classes.panel}
      value={activeTab}
      keepMounted={false}
      onChange={(value) => {
        if (value === "missing" || value === "queued") setSelectedTab(value);
      }}
      h="100%"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {partialFailures}
      <Tabs.List grow>
        {showMissing && (
          <Tabs.Tab
            data-mm-tab=""
            value="missing"
            leftSection={<IconQuestionMark size="var(--mantine-font-size-sm)" />}
          >
            <TabTitle label={t("tab.missing")} shown={missing.length} total={missingCount} />
          </Tabs.Tab>
        )}
        {showQueued && (
          <Tabs.Tab data-mm-tab="" value="queued" leftSection={<IconDownload size="var(--mantine-font-size-sm)" />}>
            <TabTitle label={t("tab.queued")} shown={queued.length} total={queuedCount} />
          </Tabs.Tab>
        )}
      </Tabs.List>

      {showMissing && (
        <Tabs.Panel value="missing" flex={1} style={{ overflow: "hidden" }}>
          {activeTab === "missing" && renderPanel("missing", missing, t("empty.missing"))}
        </Tabs.Panel>
      )}
      {showQueued && (
        <Tabs.Panel value="queued" flex={1} style={{ overflow: "hidden" }}>
          {activeTab === "queued" && renderPanel("queued", queued, t("empty.queued"))}
        </Tabs.Panel>
      )}
    </Tabs>
  );
}

const TabTitle = ({ label, shown, total }: { label: string; shown: number; total: number }) => (
  <>
    <span className={classes.tabLabelFull}>{`${label} (${shown}/${total})`}</span>
    <span className={classes.tabLabelThin}>{total}</span>
  </>
);

const posterColor = (type: "movie" | "episode" | "book") =>
  type === "movie" ? "yellow" : type === "book" ? "grape" : "blue";

const PosterIcon = ({ type, className }: { type: "movie" | "episode" | "book"; className: string | undefined }) => {
  if (type === "movie") return <IconMovie className={className} />;
  if (type === "book") return <IconBook className={className} />;
  return <IconVideo className={className} />;
};

const Poster = ({ src, type }: { src?: string | null; type: "movie" | "episode" | "book" }) => {
  if (src) {
    return <Image className={classes.poster} src={src} radius="sm" alt="" />;
  }

  return (
    <ThemeIcon className={classes.poster} radius="sm" variant="light" color={posterColor(type)}>
      <PosterIcon type={type} className={classes.posterIcon} />
    </ThemeIcon>
  );
};

const episodeCode = (item: MissingMediaItem | QueuedMediaItem) =>
  item.type === "episode" && item.seasonNumber !== undefined && item.episodeNumber !== undefined
    ? `S${String(item.seasonNumber).padStart(2, "0")}E${String(item.episodeNumber).padStart(2, "0")}`
    : null;

const TypeBadge = ({ item }: { item: MissingMediaItem | QueuedMediaItem }) => {
  const t = useI18n("widget.mediaMissing");
  const color = posterColor(item.type);
  const code = episodeCode(item);

  return (
    <Group data-mm-badges="" data-has-code={code ? "" : undefined} gap={4} wrap="nowrap">
      <Badge data-mm-badge="type" size="xs" variant="light" color={color}>
        {t(`type.${item.type}`)}
      </Badge>
      {code && (
        <>
          <Badge data-mm-badge="compactCode" size="xs" variant="light" color={color}>
            {code}
          </Badge>
          <Badge data-mm-badge="comfortableCode" size="xs" variant="outline" color="gray">
            {code}
          </Badge>
        </>
      )}
    </Group>
  );
};

const primaryTitle = (item: MissingMediaItem | QueuedMediaItem) =>
  item.type === "episode" ? (item.seriesTitle ?? item.title) : item.title;

const progressColor = (percent: number) => (percent >= 90 ? "green" : percent >= 40 ? "cyan" : "orange");

const ringVariants = [
  { size: 30, thickness: 3, fz: "8px" },
  { size: 34, thickness: 3, fz: "9px" },
  { size: 40, thickness: 4, fz: "10px" },
] as const;

const ProgressRing = ({ percent }: { percent: number }) => {
  const color = progressColor(percent);
  return (
    <>
      {ringVariants.map((ring, index) => (
        <div key={ring.size} className={classes.ring} data-ring={index}>
          <RingProgress
            size={ring.size}
            thickness={ring.thickness}
            roundCaps
            sections={[{ value: percent, color }]}
            label={
              <Text ta="center" fw={700} fz={ring.fz} lh={1}>
                {percent}
              </Text>
            }
          />
        </div>
      ))}
    </>
  );
};

const CardShell = ({ item, children }: { item: MissingMediaItem | QueuedMediaItem; children: ReactNode }) => {
  const href = getSafeApplicationUrl(item.link);
  return (
    <Paper
      className={classes.card}
      component={href ? "a" : "div"}
      href={href}
      target={href ? "_blank" : undefined}
      rel={href ? SAFE_NEW_TAB_REL : undefined}
      radius="sm"
      p="xs"
    >
      <div className={classes.content}>{children}</div>
    </Paper>
  );
};

const MediaCard = ({
  item,
  showQueueDetails,
}: {
  item: MissingMediaItem | QueuedMediaItem;
  showQueueDetails: boolean;
}) => {
  const isQueued = "percentComplete" in item;

  return (
    <CardShell item={item}>
      <Group gap="xs" wrap="nowrap" align="center" h="100%">
        <Poster src={item.imageUrl} type={item.type} />
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          <TypeBadge item={item} />
          <Text fz="xs" fw={600} lineClamp={1} lh={1.25}>
            {primaryTitle(item)}
          </Text>
          <Text className={classes.extra} fz="xs" c="dimmed" lineClamp={1} lh={1.1}>
            {item.type === "episode" ? item.title : item.type === "book" ? item.seriesTitle : item.year}
          </Text>
          {isQueued && showQueueDetails && (
            <Text fz="10px" c="dimmed" lineClamp={1} lh={1.1}>
              {[item.status, item.timeLeft].filter(Boolean).join(" · ")}
            </Text>
          )}
        </Stack>
        {isQueued && <ProgressRing percent={Math.min(100, Math.max(0, item.percentComplete))} />}
      </Group>
    </CardShell>
  );
};
