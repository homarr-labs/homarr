"use client";

import type { ReactNode } from "react";
import { Badge, Box, Center, Group, Image, Paper, RingProgress, ScrollArea, SimpleGrid, Stack, Tabs, Text, ThemeIcon } from "@mantine/core";
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
  const pageSize = Number(options.pageSize);
  const { data } = clientApi.widget.mediaOrganizer.getData.useQuery(
    { integrationIds, pageSize },
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

  const missing = data.flatMap((entry) =>
    entry.missing.map((item) => ({ item, integrationId: entry.integrationId })),
  );
  const queued = data.flatMap((entry) =>
    entry.queued.map((item) => ({ item, integrationId: entry.integrationId })),
  );
  const missingCount = data.reduce((sum, entry) => sum + entry.missingCount, 0);
  const queuedCount = data.reduce((sum, entry) => sum + entry.queuedCount, 0);

  const isThin = width > 0 && width < 160;
  const isShort = height > 0 && height < 180;
  const targetCardWidth = isShort ? 130 : 200;
  const columns = width > 0 ? Math.max(1, Math.min(Math.floor(width / targetCardWidth), 4)) : 1;
  const density: Density = isThin ? "thin" : width > 0 && width / columns < 180 ? "compact" : "comfortable";

  const tabLabel = (label: string, shown: number, total: number) =>
    isThin ? total : `${label} (${shown}/${total})`;

  const renderPanel = (entries: { item: MissingMediaItem | QueuedMediaItem; integrationId: string }[], emptyLabel: string) => (
    <ScrollArea h="100%" scrollbarSize={4}>
      <Box p="xs">
        {entries.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            {emptyLabel}
          </Text>
        ) : (
          <SimpleGrid cols={columns} spacing="xs" verticalSpacing="xs">
            {entries.map(({ item, integrationId }) => (
              <MediaCard key={`${integrationId}-${item.type}-${item.id}`} item={item} density={density} />
            ))}
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
            {tabLabel(t("tab.missing"), missing.length, missingCount)}
          </Tabs.Tab>
        )}
        {options.showQueued && (
          <Tabs.Tab value="queued" px={isThin ? 6 : undefined} leftSection={<IconDownload size={14} />}>
            {tabLabel(t("tab.queued"), queued.length, queuedCount)}
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

const CARD_HEIGHT: Record<Density, number> = { thin: 52, compact: 56, comfortable: 68 };

const posterSizes: Record<Density, number> = { thin: 34, compact: 40, comfortable: 52 };

const Poster = ({ src, type, density }: { src?: string | null; type: "movie" | "episode"; density: Density }) => {
  const size = posterSizes[density];
  const w = Math.round(size * 0.68);

  if (src) {
    return <Image className={classes.poster} src={src} h={size} w={w} radius="sm" alt="" />;
  }

  return (
    <ThemeIcon className={classes.poster} h={size} w={w} radius="sm" variant="light" color={type === "movie" ? "yellow" : "blue"}>
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

const CardShell = ({ item, density, children }: { item: MissingMediaItem | QueuedMediaItem; density: Density; children: ReactNode }) => (
  <Paper className={classes.card} component="a" href={item.link} target="_blank" rel="noreferrer" radius="sm" p="xs" h={CARD_HEIGHT[density]}>
    {item.imageUrl && (
      <span className={classes.backdrop} style={{ backgroundImage: `url("${item.imageUrl}")` }} aria-hidden />
    )}
    <div className={classes.content}>{children}</div>
  </Paper>
);

const MediaCard = ({ item, density }: { item: MissingMediaItem | QueuedMediaItem; density: Density }) => {
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
        </Stack>
        {isQueued && <ProgressRing percent={Math.min(100, Math.max(0, item.percentComplete))} density={density} />}
      </Group>
    </CardShell>
  );
};
