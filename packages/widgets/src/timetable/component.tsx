import { Alert, Badge, Center, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { DynamicSelectOption } from "../_inputs/widget-dynamic-select-input";
import type { WidgetComponentProps } from "../definition";

export default function TimetableWidget({
  options,
  displayMode = "compact",
  width,
  itemId,
}: WidgetComponentProps<"timetable">) {
  const t = useScopedI18n("widget.timetable");

  if (!options.station) {
    return <Center h="100%">{t("noStation")}</Center>;
  }

  return (
    <TimetableWidgetInner
      station={options.station}
      baseUrl={options.baseUrl}
      itemId={itemId}
      displayMode={displayMode}
      width={width}
    />
  );
}

interface TimetableWidgetInnerProps {
  station: DynamicSelectOption;
  baseUrl: string;
  itemId?: string;
  displayMode: "compact" | "advanced";
  width: number;
}

const TimetableWidgetInner = ({ station, baseUrl, itemId, displayMode, width }: TimetableWidgetInnerProps) => {
  const { data: timetable, error } = clientApi.widget.timetable.getTimetable.useQuery({
    baseUrl,
    itemId,
    stationId: station.value,
    limit: displayMode === "advanced" ? 50 : 10,
  });
  const t = useScopedI18n("widget.timetable");

  if (error && timetable === undefined) throw error;

  const entries = timetable?.entries ?? [];
  const staleTime = timetable ? dayjs(timetable.timestamp).format("HH:mm:ss") : undefined;
  const staleWarning = error && staleTime ? t("warning.stale", { time: staleTime }) : undefined;
  const compactStaleWarning = error && staleTime ? t("warning.staleCompact") : undefined;

  return (
    <Stack w="100%" h="100%" gap="xs" p="sm">
      <Text fw="bold">{t("title", { station: station.label })}</Text>
      {compactStaleWarning && displayMode === "compact" && (
        <Group gap={2} wrap="nowrap">
          <IconAlertTriangle aria-hidden size={12} color="var(--mantine-color-orange-light-color)" />
          <Text component="output" size="xs" c="var(--mantine-color-text)" style={{ whiteSpace: "nowrap" }}>
            {compactStaleWarning}
          </Text>
        </Group>
      )}
      {staleWarning && displayMode === "advanced" && (
        <Alert role="presentation" color="orange" icon={<IconAlertTriangle aria-hidden size={16} />} p="xs">
          <output>{staleWarning}</output>
        </Alert>
      )}
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <SimpleGrid cols={displayMode === "advanced" && width >= 760 ? 2 : 1} spacing="xs">
          {entries.map((entry) => (
            <DepartureRow key={`${entry.timestamp.toISOString()}-${entry.location}`} entry={entry} />
          ))}
        </SimpleGrid>
      </ScrollArea>
      {displayMode === "advanced" && timetable && (
        <Text size="xs" c="dimmed" ta="right">
          {dayjs(timetable.timestamp).format("HH:mm:ss")}
        </Text>
      )}
    </Stack>
  );
};

interface TimetableEntryView {
  timestamp: Date;
  delay: number;
  line: { name: string; color: string | null } | null;
  location: string;
  platform: { name: string; hasChanged: boolean } | null;
}

function DepartureRow({ entry }: { entry: TimetableEntryView }) {
  return (
    <Group justify="space-between" w="100%" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        {entry.line && (
          <Badge
            size="sm"
            color={entry.line.color ?? undefined}
            variant={entry.line.color ? "filled" : "default"}
            w={32}
            p={0}
            radius={0}
          >
            {entry.line.name}
          </Badge>
        )}
        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
          {dayjs(entry.timestamp).format("HH:mm")}{" "}
          {entry.delay >= 1 && (
            <Text size="sm" span c="red">
              +{entry.delay}&apos;
            </Text>
          )}
        </Text>
        <Text size="sm" truncate>
          {entry.location}
        </Text>
      </Group>

      {entry.platform && (
        <Text size="sm" c={entry.platform.hasChanged ? "red" : undefined} style={{ flexShrink: 0 }}>
          {entry.platform.name}
        </Text>
      )}
    </Group>
  );
}
