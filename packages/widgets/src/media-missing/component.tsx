"use client";

import type { ReactNode } from "react";
import { Badge, Box, Center, Group, Image, Paper, Progress, ScrollArea, SimpleGrid, Stack, Tabs, Text, ThemeIcon } from "@mantine/core";
import { IconDownload, IconMovie, IconQuestionMark, IconVideo } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { MissingMediaItem, QueuedMediaItem } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import classes from "./component.module.css";

export default function MediaMissingWidget({ integrationIds, options, width, height }: WidgetComponentProps<"mediaMissing">) {
  const t = useScopedI18n("widget.mediaMissing");
  const { data } = clientApi.widget.mediaOrganizer.getData.useQuery(
    { integrationIds },
    { staleTime: 60 * 1000, refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  if (!data) return <WidgetEmptyState />;
  if (data.length === 0) throw new NoIntegrationDataError();
  if (!options.showMissing && !options.showQueued)
    return (
      <Center h="100%" p="sm">
        <Text c="dimmed" size="sm" ta="center">
          {t("empty.noTabsEnabled")}
        </Text>
      </Center>
    );

  const missing = data.flatMap((entry) => entry.missing);
  const queued = data.flatMap((entry) => entry.queued);
  const missingCount = data.reduce((sum, entry) => sum + entry.missingCount, 0);
  const queuedCount = data.reduce((sum, entry) => sum + entry.queuedCount, 0);

  // width/height are the item's pixel size, provided by the board. The layout
  // adapts to them so the widget stays useful at any grid size: it fits as many
  // readable columns as the width allows (filling big screens instead of
  // stretching one column), packs tighter when short, and drops to a condensed
  // style with count-only tabs when very thin.
  const isThin = width > 0 && width < 160;
  const isShort = height > 0 && height < 180;
  const targetCardWidth = isShort ? 130 : 200;
  const columns = width > 0 ? Math.max(1, Math.min(Math.floor(width / targetCardWidth), 4)) : 1;
  const density = isThin ? "thin" : width > 0 && width / columns < 180 ? "compact" : "comfortable";

  const renderPanel = (items: (MissingMediaItem | QueuedMediaItem)[], emptyLabel: string) => (
    <ScrollArea h="100%" scrollbarSize={4}>
      <Box p="xs">
        {items.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            {emptyLabel}
          </Text>
        ) : (
          <SimpleGrid cols={columns} spacing="xs" verticalSpacing="xs">
            {items.map((item) =>
              "percentComplete" in item ? (
                <QueuedCard key={`${item.type}-${item.id}`} item={item} density={density} />
              ) : (
                <MissingCard key={`${item.type}-${item.id}`} item={item} density={density} />
              ),
            )}
          </SimpleGrid>
        )}
      </Box>
    </ScrollArea>
  );

  return (
    <Tabs
      defaultValue={options.showMissing ? "missing" : "queued"}
      h="100%"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Tabs.List grow>
        {options.showMissing && (
          <Tabs.Tab value="missing" px={isThin ? 6 : undefined} leftSection={<IconQuestionMark size={14} />}>
            {isThin ? missingCount : `${t("tab.missing")} (${missingCount})`}
          </Tabs.Tab>
        )}
        {options.showQueued && (
          <Tabs.Tab value="queued" px={isThin ? 6 : undefined} leftSection={<IconDownload size={14} />}>
            {isThin ? queuedCount : `${t("tab.queued")} (${queuedCount})`}
          </Tabs.Tab>
        )}
      </Tabs.List>

      {options.showMissing && (
        <Tabs.Panel value="missing" flex={1} style={{ overflow: "hidden" }}>
          {renderPanel(missing, t("empty.missing"))}
        </Tabs.Panel>
      )}
      {options.showQueued && (
        <Tabs.Panel value="queued" flex={1} style={{ overflow: "hidden" }}>
          {renderPanel(queued, t("empty.queued"))}
        </Tabs.Panel>
      )}
    </Tabs>
  );
}

type Density = "thin" | "compact" | "comfortable";

const posterSizes: Record<Density, number> = { thin: 34, compact: 40, comfortable: 52 };

const Poster = ({ src, type, density }: { src?: string | null; type: "movie" | "episode"; density: Density }) => {
  const size = posterSizes[density];
  const width = Math.round(size * 0.68);

  if (src) {
    return <Image className={classes.poster} src={src} h={size} w={width} radius="sm" alt="" />;
  }

  return (
    <ThemeIcon className={classes.poster} h={size} w={width} radius="sm" variant="light" color={type === "movie" ? "yellow" : "blue"}>
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

  // Tight layouts only have room for one badge, so show the most identifying
  // one: the episode code when available, otherwise the media type.
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

const CardShell = ({ item, children }: { item: MissingMediaItem | QueuedMediaItem; children: ReactNode }) => (
  <Paper className={classes.card} component="a" href={item.link} target="_blank" rel="noreferrer" radius="sm" p="xs">
    {item.imageUrl && (
      <span className={classes.backdrop} style={{ backgroundImage: `url("${item.imageUrl}")` }} aria-hidden />
    )}
    <div className={classes.content}>{children}</div>
  </Paper>
);

const CardHeader = ({ item, density }: { item: MissingMediaItem | QueuedMediaItem; density: Density }) => (
  <Group gap="xs" wrap="nowrap" align="flex-start">
    <Poster src={item.imageUrl} type={item.type} density={density} />
    <Stack gap={3} style={{ minWidth: 0 }}>
      <TypeBadge item={item} density={density} />
      <Text fz="xs" fw={600} lineClamp={2} lh={1.25}>
        {primaryTitle(item)}
      </Text>
      {density === "comfortable" && (
        <Text fz="xs" c="dimmed" lineClamp={1} lh={1.1}>
          {item.type === "episode" ? item.title : item.year}
        </Text>
      )}
    </Stack>
  </Group>
);

const MissingCard = ({ item, density }: { item: MissingMediaItem; density: Density }) => (
  <CardShell item={item}>
    <CardHeader item={item} density={density} />
  </CardShell>
);

const progressColor = (percent: number) => (percent >= 90 ? "green" : percent >= 40 ? "cyan" : "orange");

const QueuedCard = ({ item, density }: { item: QueuedMediaItem; density: Density }) => {
  const color = progressColor(item.percentComplete);
  const isDownloading = item.percentComplete < 100;

  return (
    <CardShell item={item}>
      <Stack gap={6}>
        <CardHeader item={item} density={density} />
        <Stack gap={3}>
          <Progress
            value={item.percentComplete}
            size="sm"
            radius="xl"
            color={color}
            striped={isDownloading}
            animated={isDownloading}
          />
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Group gap={5} wrap="nowrap" style={{ minWidth: 0 }}>
              {isDownloading && <Box className={classes.dot} w={6} h={6} bg={`var(--mantine-color-${color}-5)`} style={{ borderRadius: "50%" }} />}
              <Text fz="xs" c="dimmed" lineClamp={1}>
                {item.timeLeft ?? item.status}
              </Text>
            </Group>
            <Text fz="xs" fw={600} c={`var(--mantine-color-${color}-4)`} style={{ flexShrink: 0 }}>
              {item.percentComplete}%
            </Text>
          </Group>
        </Stack>
      </Stack>
    </CardShell>
  );
};
