"use client";

import { Anchor, Badge, Box, Group, Image, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
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

  return (
    <Box h="100%">
      <Tabs defaultValue={defaultTab} h="100%" style={{ display: "flex", flexDirection: "column" }}>
        <Tabs.List>
          {options.showMissing && (
            <Tabs.Tab value="missing" leftSection={<IconQuestionMark size={14} />}>
              {t("tab.missing")} ({missingCount})
            </Tabs.Tab>
          )}
          {options.showQueued && (
            <Tabs.Tab value="queued" leftSection={<IconDownload size={14} />}>
              {t("tab.queued")} ({queuedCount})
            </Tabs.Tab>
          )}
        </Tabs.List>

        {options.showMissing && (
          <Tabs.Panel value="missing" flex={1} style={{ overflow: "hidden" }}>
            <ScrollArea h="100%" scrollbarSize="md">
              <Stack gap="xs" p="sm">
                {allMissing.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {t("empty.missing")}
                  </Text>
                ) : (
                  allMissing.map((item) => (
                    <MediaMissingItem key={`missing-${item.type}-${item.id}`} item={item} />
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
        )}

        {options.showQueued && (
          <Tabs.Panel value="queued" flex={1} style={{ overflow: "hidden" }}>
            <ScrollArea h="100%" scrollbarSize="md">
              <Stack gap="xs" p="sm">
                {allQueued.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {t("empty.queued")}
                  </Text>
                ) : (
                  allQueued.map((item) => (
                    <MediaQueuedItem key={`queued-${item.type}-${item.id}`} item={item} />
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
}

const MediaMissingItem = ({ item }: MissingItemProps) => {
  const t = useScopedI18n("widget.mediaMissing");

  return (
    <Group gap="sm" wrap="nowrap">
      {item.imageUrl && <Image src={item.imageUrl} h={48} w="auto" radius="sm" alt={item.title} />}
      <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
        <Group gap="xs">
          <Badge size="xs" color={item.type === "movie" ? "yellow" : "blue"} variant="light">
            {t(`type.${item.type}`)}
          </Badge>
          {item.type === "episode" && item.seasonNumber !== undefined && item.episodeNumber !== undefined && (
            <Badge size="xs" color="gray" variant="outline">
              S{String(item.seasonNumber).padStart(2, "0")}E{String(item.episodeNumber).padStart(2, "0")}
            </Badge>
          )}
        </Group>
        <Anchor href={item.link} target="_blank" c="var(--mantine-color-text)" fz="sm" fw="bold" lineClamp={1}>
          {item.type === "episode" ? (item.seriesTitle ?? item.title) : item.title}
        </Anchor>
        {item.type === "episode" && item.seriesTitle && (
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
}

const MediaQueuedItem = ({ item }: QueuedItemProps) => {
  const t = useScopedI18n("widget.mediaMissing");

  return (
    <Group gap="sm" wrap="nowrap">
      {item.imageUrl && <Image src={item.imageUrl} h={48} w="auto" radius="sm" alt={item.title} />}
      <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
        <Group gap="xs">
          <Badge size="xs" color={item.type === "movie" ? "yellow" : "blue"} variant="light">
            {t(`type.${item.type}`)}
          </Badge>
          {item.type === "episode" && item.seasonNumber !== undefined && item.episodeNumber !== undefined && (
            <Badge size="xs" color="gray" variant="outline">
              S{String(item.seasonNumber).padStart(2, "0")}E{String(item.episodeNumber).padStart(2, "0")}
            </Badge>
          )}
          <Badge size="xs" color="cyan" variant="light">
            {item.percentComplete}%
          </Badge>
        </Group>
        <Anchor href={item.link} target="_blank" c="var(--mantine-color-text)" fz="sm" fw="bold" lineClamp={1}>
          {item.type === "episode" ? (item.seriesTitle ?? item.title) : item.title}
        </Anchor>
        {item.type === "episode" && item.seriesTitle && (
          <Text fz="xs" c="dimmed" lineClamp={1}>
            {item.title}
          </Text>
        )}
        {item.timeLeft && (
          <Text fz="xs" c="dimmed">
            {t("timeLeft")}: {item.timeLeft}
          </Text>
        )}
      </Stack>
    </Group>
  );
};
