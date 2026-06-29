"use client";

import { Anchor, Box, Badge, Group, Image, Paper, Progress, ScrollArea, SimpleGrid, Stack, Tabs, Text, ThemeIcon } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconDownload, IconMovie, IconQuestionMark, IconVideo } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

export default function MediaMissingWidget({ integrationIds, options }: WidgetComponentProps<"mediaMissing">) {
  const t = useScopedI18n("widget.mediaMissing");
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { data } = clientApi.widget.mediaOrganizer.getData.useQuery(
    { integrationIds },
    { staleTime: 60 * 1000, refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  if (!data) return <WidgetEmptyState />;
  if (data.length === 0) throw new NoIntegrationDataError();

  const allMissing = data.flatMap((d) => d.missing);
  const allQueued = data.flatMap((d) => d.queued);
  const missingCount = data.reduce((acc, d) => acc + d.missingCount, 0);
  const queuedCount = data.reduce((acc, d) => acc + d.queuedCount, 0);

  const defaultTab = options.showMissing ? "missing" : "queued";
  const narrow = width > 0 && width < 200;
  const twoCol = width >= 380 && height > 0 && height < 220;
  const posterSize = narrow ? 32 : 48;

  return (
    <Box ref={ref} h="100%">
      <Tabs defaultValue={defaultTab} h="100%" style={{ display: "flex", flexDirection: "column" }}>
        <Tabs.List grow>
          {options.showMissing && (
            <Tabs.Tab value="missing" leftSection={<IconQuestionMark size={14} />}>
              {narrow ? missingCount : `${t("tab.missing")} (${missingCount})`}
            </Tabs.Tab>
          )}
          {options.showQueued && (
            <Tabs.Tab value="queued" leftSection={<IconDownload size={14} />}>
              {narrow ? queuedCount : `${t("tab.queued")} (${queuedCount})`}
            </Tabs.Tab>
          )}
        </Tabs.List>

        {options.showMissing && (
          <Tabs.Panel value="missing" flex={1} style={{ overflow: "hidden" }}>
            <ScrollArea h="100%" scrollbarSize={4}>
              <Box p="xs">
                {allMissing.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {t("empty.missing")}
                  </Text>
                ) : (
                  <SimpleGrid cols={twoCol ? 2 : 1} spacing="xs">
                    {allMissing.map((item) => (
                      <MissingItem key={`${item.type}-${item.id}`} item={item} posterSize={posterSize} />
                    ))}
                  </SimpleGrid>
                )}
              </Box>
            </ScrollArea>
          </Tabs.Panel>
        )}

        {options.showQueued && (
          <Tabs.Panel value="queued" flex={1} style={{ overflow: "hidden" }}>
            <ScrollArea h="100%" scrollbarSize={4}>
              <Box p="xs">
                {allQueued.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {t("empty.queued")}
                  </Text>
                ) : (
                  <SimpleGrid cols={twoCol ? 2 : 1} spacing="xs">
                    {allQueued.map((item) => (
                      <QueuedItem key={`${item.type}-${item.id}`} item={item} posterSize={posterSize} />
                    ))}
                  </SimpleGrid>
                )}
              </Box>
            </ScrollArea>
          </Tabs.Panel>
        )}
      </Tabs>
    </Box>
  );
}

type MissingItemType = {
  title: string;
  type: "movie" | "episode";
  seasonNumber?: number;
  episodeNumber?: number;
  seriesTitle?: string;
  imageUrl?: string | null;
  id: string | number;
  link: string;
};

type QueuedItemType = MissingItemType & {
  status: string;
  timeLeft: string | null;
  percentComplete: number;
};

const Poster = ({ src, size, type }: { src?: string | null; size: number; type: "movie" | "episode" }) => {
  if (src) {
    return (
      <Image
        src={src}
        h={size}
        w={Math.round(size * 0.67)}
        radius="xs"
        alt=""
        style={{ flexShrink: 0, objectFit: "cover" }}
      />
    );
  }
  return (
    <ThemeIcon size={size} radius="xs" variant="light" color={type === "movie" ? "yellow" : "blue"} style={{ flexShrink: 0 }}>
      {type === "movie" ? <IconMovie size={size * 0.55} /> : <IconVideo size={size * 0.55} />}
    </ThemeIcon>
  );
};

const MissingItem = ({ item, posterSize }: { item: MissingItemType; posterSize: number }) => {
  const t = useScopedI18n("widget.mediaMissing");

  return (
    <Paper
      component={Anchor}
      href={item.link}
      target="_blank"
      withBorder
      radius="sm"
      p="xs"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Group gap="xs" wrap="nowrap">
        <Poster src={item.imageUrl} size={posterSize} type={item.type} />
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Badge size="xs" color={item.type === "movie" ? "yellow" : "blue"} variant="light">
            {t(`type.${item.type}`)}
          </Badge>
          <Text fz="xs" fw={600} lineClamp={2} lh={1.3}>
            {item.type === "episode" ? (item.seriesTitle ?? item.title) : item.title}
          </Text>
          {item.type === "episode" && item.seasonNumber !== undefined && item.episodeNumber !== undefined && (
            <Text fz="xs" c="dimmed" lh={1}>
              S{String(item.seasonNumber).padStart(2, "0")}E{String(item.episodeNumber).padStart(2, "0")}
            </Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
};

const QueuedItem = ({ item, posterSize }: { item: QueuedItemType; posterSize: number }) => {
  const t = useScopedI18n("widget.mediaMissing");

  return (
    <Paper
      component={Anchor}
      href={item.link}
      target="_blank"
      withBorder
      radius="sm"
      p="xs"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Stack gap={4}>
        <Group gap="xs" wrap="nowrap">
          <Poster src={item.imageUrl} size={posterSize} type={item.type} />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Badge size="xs" color={item.type === "movie" ? "yellow" : "blue"} variant="light">
              {t(`type.${item.type}`)}
            </Badge>
            <Text fz="xs" fw={600} lineClamp={2} lh={1.3}>
              {item.type === "episode" ? (item.seriesTitle ?? item.title) : item.title}
            </Text>
            {item.type === "episode" && item.seasonNumber !== undefined && item.episodeNumber !== undefined && (
              <Text fz="xs" c="dimmed" lh={1}>
                S{String(item.seasonNumber).padStart(2, "0")}E{String(item.episodeNumber).padStart(2, "0")}
              </Text>
            )}
          </Stack>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Progress value={item.percentComplete} size="sm" flex={1} color="cyan" radius="xl" />
          <Text fz="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {item.percentComplete}%{item.timeLeft ? ` · ${item.timeLeft}` : ""}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
};
