"use client";

import { Anchor, Badge, Box, Group, Image, Progress, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconDownload, IconQuestionMark } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

export default function MediaMissingWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"mediaMissing">) {
  const t = useScopedI18n("widget.mediaMissing");
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { data } = clientApi.widget.mediaOrganizer.getData.useQuery(
    { integrationIds },
    {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  if (!data) return <WidgetEmptyState />;
  if (data.length === 0) throw new NoIntegrationDataError();

  const allMissing = data.flatMap((d) => d.missing);
  const allQueued = data.flatMap((d) => d.queued);
  const missingCount = data.reduce((acc, d) => acc + d.missingCount, 0);
  const queuedCount = data.reduce((acc, d) => acc + d.queuedCount, 0);

  const defaultTab = options.showMissing ? "missing" : "queued";
  const isNarrow = width > 0 && width < 220;
  const isCompact = height > 0 && height < 200;

  return (
    <Box ref={ref} h="100%">
      <Tabs defaultValue={defaultTab} h="100%" style={{ display: "flex", flexDirection: "column" }}>
        <Tabs.List>
          {options.showMissing && (
            <Tabs.Tab value="missing" leftSection={<IconQuestionMark size={14} />}>
              {isNarrow ? missingCount : `${t("tab.missing")} (${missingCount})`}
            </Tabs.Tab>
          )}
          {options.showQueued && (
            <Tabs.Tab value="queued" leftSection={<IconDownload size={14} />}>
              {isNarrow ? queuedCount : `${t("tab.queued")} (${queuedCount})`}
            </Tabs.Tab>
          )}
        </Tabs.List>

        {options.showMissing && (
          <Tabs.Panel value="missing" flex={1} style={{ overflow: "hidden" }}>
            <ScrollArea h="100%" scrollbarSize={4}>
              <Stack gap={isCompact ? 4 : "xs"} p={isCompact ? "xs" : "sm"}>
                {allMissing.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {t("empty.missing")}
                  </Text>
                ) : (
                  allMissing.map((item) => (
                    <MediaMissingItem
                      key={`missing-${item.type}-${item.id}`}
                      item={item}
                      compact={isNarrow || isCompact}
                    />
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
        )}

        {options.showQueued && (
          <Tabs.Panel value="queued" flex={1} style={{ overflow: "hidden" }}>
            <ScrollArea h="100%" scrollbarSize={4}>
              <Stack gap={isCompact ? 4 : "xs"} p={isCompact ? "xs" : "sm"}>
                {allQueued.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {t("empty.queued")}
                  </Text>
                ) : (
                  allQueued.map((item) => (
                    <MediaQueuedItem
                      key={`queued-${item.type}-${item.id}`}
                      item={item}
                      compact={isNarrow || isCompact}
                    />
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
        )}
      </Tabs>
    </Box>
  );
}

interface MissingItemProps {
  item: {
    title: string;
    type: "movie" | "episode";
    seasonNumber?: number;
    episodeNumber?: number;
    seriesTitle?: string;
    imageUrl?: string | null;
    link: string;
  };
  compact: boolean;
}

const MediaMissingItem = ({ item, compact }: MissingItemProps) => {
  const t = useScopedI18n("widget.mediaMissing");

  return (
    <Group gap="sm" wrap="nowrap">
      {!compact && item.imageUrl && (
        <Image src={item.imageUrl} h={52} w="auto" radius="sm" alt={item.title} style={{ flexShrink: 0 }} />
      )}
      <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
        <Group gap={4} wrap="nowrap">
          <Badge size="xs" color={item.type === "movie" ? "yellow" : "blue"} variant="light" style={{ flexShrink: 0 }}>
            {t(`type.${item.type}`)}
          </Badge>
          {item.type === "episode" && item.seasonNumber !== undefined && item.episodeNumber !== undefined && (
            <Badge size="xs" color="gray" variant="outline" style={{ flexShrink: 0 }}>
              S{String(item.seasonNumber).padStart(2, "0")}E{String(item.episodeNumber).padStart(2, "0")}
            </Badge>
          )}
        </Group>
        <Anchor href={item.link} target="_blank" c="var(--mantine-color-text)" fz="sm" fw={600} lineClamp={1}>
          {item.type === "episode" ? (item.seriesTitle ?? item.title) : item.title}
        </Anchor>
        {!compact && item.type === "episode" && item.seriesTitle && (
          <Text fz="xs" c="dimmed" lineClamp={1}>
            {item.title}
          </Text>
        )}
      </Stack>
    </Group>
  );
};

interface QueuedItemProps {
  item: {
    title: string;
    type: "movie" | "episode";
    seasonNumber?: number;
    episodeNumber?: number;
    seriesTitle?: string;
    status: string;
    timeLeft: string | null;
    percentComplete: number;
    imageUrl?: string | null;
    link: string;
  };
  compact: boolean;
}

const MediaQueuedItem = ({ item, compact }: QueuedItemProps) => {
  const t = useScopedI18n("widget.mediaMissing");

  return (
    <Stack gap={4}>
      <Group gap="sm" wrap="nowrap">
        {!compact && item.imageUrl && (
          <Image src={item.imageUrl} h={52} w="auto" radius="sm" alt={item.title} style={{ flexShrink: 0 }} />
        )}
        <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
          <Group gap={4} wrap="nowrap">
            <Badge size="xs" color={item.type === "movie" ? "yellow" : "blue"} variant="light" style={{ flexShrink: 0 }}>
              {t(`type.${item.type}`)}
            </Badge>
            {item.type === "episode" && item.seasonNumber !== undefined && item.episodeNumber !== undefined && (
              <Badge size="xs" color="gray" variant="outline" style={{ flexShrink: 0 }}>
                S{String(item.seasonNumber).padStart(2, "0")}E{String(item.episodeNumber).padStart(2, "0")}
              </Badge>
            )}
          </Group>
          <Anchor href={item.link} target="_blank" c="var(--mantine-color-text)" fz="sm" fw={600} lineClamp={1}>
            {item.type === "episode" ? (item.seriesTitle ?? item.title) : item.title}
          </Anchor>
          {!compact && item.type === "episode" && item.seriesTitle && (
            <Text fz="xs" c="dimmed" lineClamp={1}>
              {item.title}
            </Text>
          )}
        </Stack>
      </Group>
      <Group gap="xs" align="center" wrap="nowrap">
        <Progress value={item.percentComplete} size="xs" flex={1} color="cyan" />
        <Text fz="xs" c="dimmed" style={{ flexShrink: 0 }}>
          {item.percentComplete}%{!compact && item.timeLeft ? ` · ${item.timeLeft}` : ""}
        </Text>
      </Group>
    </Stack>
  );
};
