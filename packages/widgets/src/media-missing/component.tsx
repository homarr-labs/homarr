"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
import { IconDownload, IconMovie, IconQuestionMark, IconVideo } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import type { MissingMediaItem, QueuedMediaItem } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import classes from "./component.module.css";
import type { MediaMissingTab } from "./tabs";
import { resolveMediaMissingTab } from "./tabs";

export default function MediaMissingWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode,
  widgetRuntimeRef,
}: WidgetComponentProps<"mediaMissing">) {
  const t = useScopedI18n("widget.mediaMissing");
  const isAdvanced = displayMode === "advanced";
  const showMissing = isAdvanced || options.showMissing;
  const showQueued = isAdvanced || options.showQueued;
  const pageSize = isAdvanced ? Math.max(Number(options.pageSize), 50) : Number(options.pageSize);
  const input = { integrationIds, pageSize };
  useWidgetRuntimeQueries(widgetRuntimeRef, [getQueryKey(clientApi.widget.mediaOrganizer.getData, input, "query")]);
  const mediaQuery = clientApi.widget.mediaOrganizer.getData.useQuery(input, {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const data = getUsableWidgetQueryData(mediaQuery);
  const [selectedTab, setSelectedTab] = useState<MediaMissingTab>(showMissing ? "missing" : "queued");
  const activeTab = resolveMediaMissingTab(selectedTab, showMissing, showQueued);

  useEffect(() => {
    if (activeTab !== null && activeTab !== selectedTab) setSelectedTab(activeTab);
  }, [activeTab, selectedTab]);

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

  const enabledPanelCount = Number(showMissing) + Number(showQueued);
  const panelWidth = isAdvanced && enabledPanelCount > 1 ? width / enabledPanelCount : width;
  const isThin = !isAdvanced && panelWidth > 0 && panelWidth < 160;
  const isShort = !isAdvanced && height > 0 && height < 180;
  const targetCardWidth = isShort ? 130 : 200;
  const columns = panelWidth > 0 ? Math.max(1, Math.min(Math.floor(panelWidth / targetCardWidth), 4)) : 1;
  const density: Density = isThin ? "thin" : panelWidth > 0 && panelWidth / columns < 180 ? "compact" : "comfortable";

  const tabLabel = (label: string, shown: number, total: number) => (isThin ? total : `${label} (${shown}/${total})`);

  const renderPanel = (
    entries: { item: MissingMediaItem | QueuedMediaItem; integrationId: string }[],
    emptyLabel: string,
  ) => (
    <ScrollArea h="100%" scrollbarSize={4}>
      <Box p="xs">
        {entries.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            {emptyLabel}
          </Text>
        ) : (
          <SimpleGrid cols={columns} spacing="xs" verticalSpacing="xs">
            {entries.map(({ item, integrationId }) => (
              <MediaCard
                key={`${integrationId}-${item.type}-${item.id}`}
                item={item}
                density={density}
                showQueueDetails={isAdvanced}
              />
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
  const queryFailure = <WidgetQueryErrorIndicator error={mediaQuery.error} label={t("name")} />;

  if (isAdvanced) {
    return (
      <Stack h="100%" gap={0}>
        <Group justify="flex-end" px="xs">
          {queryFailure}
          {partialFailures}
        </Group>
        <SimpleGrid cols={enabledPanelCount} spacing="sm" p="sm" style={{ flex: 1, minHeight: 0 }}>
          {showMissing && (
            <Paper withBorder radius="sm" style={{ minHeight: 0, overflow: "hidden" }}>
              <Group p="xs" gap="xs">
                <IconQuestionMark size="var(--mantine-font-size-md)" />
                <Text size="sm" fw={600}>
                  {tabLabel(t("tab.missing"), missing.length, missingCount)}
                </Text>
              </Group>
              <Box h="calc(100% - 40px)">{renderPanel(missing, t("empty.missing"))}</Box>
            </Paper>
          )}
          {showQueued && (
            <Paper withBorder radius="sm" style={{ minHeight: 0, overflow: "hidden" }}>
              <Group p="xs" gap="xs">
                <IconDownload size="var(--mantine-font-size-md)" />
                <Text size="sm" fw={600}>
                  {tabLabel(t("tab.queued"), queued.length, queuedCount)}
                </Text>
              </Group>
              <Box h="calc(100% - 40px)">{renderPanel(queued, t("empty.queued"))}</Box>
            </Paper>
          )}
        </SimpleGrid>
      </Stack>
    );
  }

  return (
    <Tabs
      value={activeTab}
      keepMounted={false}
      onChange={(value) => {
        if (value === "missing" || value === "queued") setSelectedTab(value);
      }}
      h="100%"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Group justify="flex-end" px="xs">
        {queryFailure}
        {partialFailures}
      </Group>
      <Tabs.List grow>
        {showMissing && (
          <Tabs.Tab value="missing" px={isThin ? 6 : undefined} leftSection={<IconQuestionMark size="var(--mantine-font-size-sm)" />}>
            {tabLabel(t("tab.missing"), missing.length, missingCount)}
          </Tabs.Tab>
        )}
        {showQueued && (
          <Tabs.Tab value="queued" px={isThin ? 6 : undefined} leftSection={<IconDownload size="var(--mantine-font-size-sm)" />}>
            {tabLabel(t("tab.queued"), queued.length, queuedCount)}
          </Tabs.Tab>
        )}
      </Tabs.List>

      {showMissing && (
        <Tabs.Panel value="missing" flex={1} style={{ overflow: "hidden" }}>
          {activeTab === "missing" && renderPanel(missing, t("empty.missing"))}
        </Tabs.Panel>
      )}
      {showQueued && (
        <Tabs.Panel value="queued" flex={1} style={{ overflow: "hidden" }}>
          {activeTab === "queued" && renderPanel(queued, t("empty.queued"))}
        </Tabs.Panel>
      )}
    </Tabs>
  );
}

type Density = "thin" | "compact" | "comfortable";

const CARD_HEIGHT: Record<Density, number> = { thin: 52, compact: 56, comfortable: 68 };

const posterSizes: Record<Density, number> = { thin: 34, compact: 40, comfortable: 52 };

const Poster = ({ src, type, density }: { src?: string | null; type: "movie" | "episode"; density: Density }) => {
  const size = posterSizes[density];
  const w = Math.round(size * 0.68);

  if (src) {
    return <Image className={classes.poster} src={src} h={size} w={w} radius="sm" alt="" />;
  }

  return (
    <ThemeIcon
      className={classes.poster}
      h={size}
      w={w}
      radius="sm"
      variant="light"
      color={type === "movie" ? "yellow" : "blue"}
    >
      {type === "movie" ? <IconMovie size={size * 0.5} /> : <IconVideo size={size * 0.5} />}
    </ThemeIcon>
  );
};

const episodeCode = (item: MissingMediaItem | QueuedMediaItem) =>
  item.type === "episode" && item.seasonNumber !== undefined && item.episodeNumber !== undefined
    ? `S${String(item.seasonNumber).padStart(2, "0")}E${String(item.episodeNumber).padStart(2, "0")}`
    : null;

const TypeBadge = ({ item, density }: { item: MissingMediaItem | QueuedMediaItem; density: Density }) => {
  const t = useScopedI18n("widget.mediaMissing");
  const color = item.type === "movie" ? "yellow" : "blue";
  const code = episodeCode(item);

  if (density !== "comfortable") {
    return (
      <Badge size="xs" variant="light" color={color}>
        {code ?? t(`type.${item.type}`)}
      </Badge>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      <Badge size="xs" variant="light" color={color}>
        {t(`type.${item.type}`)}
      </Badge>
      {code && (
        <Badge size="xs" variant="outline" color="gray">
          {code}
        </Badge>
      )}
    </Group>
  );
};

const primaryTitle = (item: MissingMediaItem | QueuedMediaItem) =>
  item.type === "episode" ? (item.seriesTitle ?? item.title) : item.title;

const progressColor = (percent: number) => (percent >= 90 ? "green" : percent >= 40 ? "cyan" : "orange");

const ringSizes: Record<Density, { size: number; thickness: number; fz: string }> = {
  thin: { size: 30, thickness: 3, fz: "8px" },
  compact: { size: 34, thickness: 3, fz: "9px" },
  comfortable: { size: 40, thickness: 4, fz: "10px" },
};

const ProgressRing = ({ percent, density }: { percent: number; density: Density }) => {
  const color = progressColor(percent);
  const ring = ringSizes[density];
  return (
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
  );
};

const CardShell = ({
  item,
  density,
  children,
}: {
  item: MissingMediaItem | QueuedMediaItem;
  density: Density;
  children: ReactNode;
}) => {
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
      h={CARD_HEIGHT[density]}
    >
      <div className={classes.content}>{children}</div>
    </Paper>
  );
};

const MediaCard = ({
  item,
  density,
  showQueueDetails,
}: {
  item: MissingMediaItem | QueuedMediaItem;
  density: Density;
  showQueueDetails: boolean;
}) => {
  const isQueued = "percentComplete" in item;

  return (
    <CardShell item={item} density={density}>
      <Group gap="xs" wrap="nowrap" align="center" h="100%">
        <Poster src={item.imageUrl} type={item.type} density={density} />
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          <TypeBadge item={item} density={density} />
          <Text fz="xs" fw={600} lineClamp={1} lh={1.25}>
            {primaryTitle(item)}
          </Text>
          {density === "comfortable" && (
            <Text fz="xs" c="dimmed" lineClamp={1} lh={1.1}>
              {item.type === "episode" ? item.title : item.year}
            </Text>
          )}
          {isQueued && showQueueDetails && (
            <Text fz="10px" c="dimmed" lineClamp={1} lh={1.1}>
              {[item.status, item.timeLeft].filter(Boolean).join(" · ")}
            </Text>
          )}
        </Stack>
        {isQueued && <ProgressRing percent={Math.min(100, Math.max(0, item.percentComplete))} density={density} />}
      </Group>
    </CardShell>
  );
};
