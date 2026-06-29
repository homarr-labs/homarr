"use client";

import { Badge, Box, Group, Image, Paper, Progress, ScrollArea, SimpleGrid, Stack, Tabs, Text, ThemeIcon } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconDownload, IconMovie, IconQuestionMark, IconVideo } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { MissingMediaItem, QueuedMediaItem } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import classes from "./component.module.css";

export default function MediaMissingWidget({ integrationIds, options }: WidgetComponentProps<"mediaMissing">) {
  const t = useScopedI18n("widget.mediaMissing");
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { data } = clientApi.widget.mediaOrganizer.getData.useQuery(
    { integrationIds },
    { staleTime: 60 * 1000, refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  if (!data) return <WidgetEmptyState />;
  if (data.length === 0) throw new NoIntegrationDataError();

  const missing = data.flatMap((entry) => entry.missing);
  const queued = data.flatMap((entry) => entry.queued);
  const missingCount = data.reduce((sum, entry) => sum + entry.missingCount, 0);
  const queuedCount = data.reduce((sum, entry) => sum + entry.queuedCount, 0);

  // The widget can be resized to any grid size, so layout is derived from the
  // measured container rather than fixed breakpoints. A short container lays
  // items out in columns to use the horizontal space; a thin one drops to a
  // condensed style with count-only tabs.
  const isThin = width > 0 && width < 160;
  const isShort = height > 0 && height < 180;
  const columns = isShort ? (width >= 560 ? 4 : width >= 380 ? 3 : width >= 220 ? 2 : 1) : 1;
  const density = isThin ? "thin" : isShort ? "compact" : "comfortable";

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
    <Box ref={ref} h="100%">
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
    </Box>
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

const MissingCard = ({ item, density }: { item: MissingMediaItem; density: Density }) => {
  const subtitle = item.type === "episode" ? item.title : item.year?.toString();

  return (
    <Paper className={classes.card} component="a" href={item.link} target="_blank" rel="noreferrer" radius="sm" p="xs">
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Poster src={item.imageUrl} type={item.type} density={density} />
        <Stack gap={3} style={{ minWidth: 0 }}>
          <TypeBadge item={item} density={density} />
          <Text fz="xs" fw={600} lineClamp={2} lh={1.25}>
            {primaryTitle(item)}
          </Text>
          {density === "comfortable" && subtitle && (
            <Text fz="xs" c="dimmed" lineClamp={1} lh={1.1}>
              {subtitle}
            </Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
};

const progressColor = (percent: number) => (percent >= 90 ? "green" : percent >= 40 ? "cyan" : "orange");

const QueuedCard = ({ item, density }: { item: QueuedMediaItem; density: Density }) => {
  return (
    <Paper className={classes.card} component="a" href={item.link} target="_blank" rel="noreferrer" radius="sm" p="xs">
      <Stack gap={6}>
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Poster src={item.imageUrl} type={item.type} density={density} />
          <Stack gap={3} style={{ minWidth: 0 }}>
            <TypeBadge item={item} density={density} />
            <Text fz="xs" fw={600} lineClamp={2} lh={1.25}>
              {primaryTitle(item)}
            </Text>
          </Stack>
        </Group>
        <Stack gap={2}>
          <Progress value={item.percentComplete} size="sm" radius="xl" color={progressColor(item.percentComplete)} />
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Text fz="xs" c="dimmed" lineClamp={1}>
              {item.timeLeft ?? item.status}
            </Text>
            <Text fz="xs" c="dimmed" fw={500} style={{ flexShrink: 0 }}>
              {item.percentComplete}%
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Paper>
  );
};
