import { Alert, Badge, Center, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import type { DynamicSelectOption } from "../_inputs/widget-dynamic-select-input";
import { formatLocalizedTime } from "../common/locale";
import type { WidgetComponentProps } from "../definition";

export default function TimetableWidget({
  options,
  displayMode = "compact",
  width,
  height,
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
      height={height}
    />
  );
}

interface TimetableWidgetInnerProps {
  station: DynamicSelectOption;
  baseUrl: string;
  itemId?: string;
  displayMode: "compact" | "advanced";
  width: number;
  height: number;
}

const TimetableWidgetInner = ({ station, baseUrl, itemId, displayMode, width, height }: TimetableWidgetInnerProps) => {
  const {
    data: timetable,
    error,
    isPending,
  } = clientApi.widget.timetable.getTimetable.useQuery({
    baseUrl,
    itemId,
    stationId: station.value,
    limit: displayMode === "advanced" ? 50 : 10,
  });
  const t = useScopedI18n("widget.timetable");
  const tCommon = useScopedI18n("common");
  const locale = useCurrentIntlLocale();

  if (error && timetable === undefined) throw error;

  const entries = timetable?.entries ?? [];
  const staleTime = timetable ? formatLocalizedTime(timetable.timestamp, locale, { includeSeconds: true }) : undefined;
  const staleWarning = error && staleTime ? t("warning.stale", { time: staleTime }) : undefined;
  const compactStaleWarning = error && staleTime ? t("warning.staleCompact") : undefined;
  const isAdvanced = displayMode === "advanced";
  const isDense = !isAdvanced && (width < 300 || height < 160);
  const showTitle = isAdvanced || height >= 112;
  const showLine = isAdvanced || width >= 200;
  const showPlatform = isAdvanced || width >= 320;

  return (
    <Stack w="100%" h="100%" gap={isDense ? 4 : "xs"} p={isDense ? "xs" : "sm"}>
      {showTitle && (
        <Text fw={600} size={isDense ? "sm" : undefined} truncate="end">
          {t("title", { station: station.label })}
        </Text>
      )}
      {compactStaleWarning && displayMode === "compact" && (
        <Group gap={2} wrap="nowrap">
          <IconAlertTriangle
            aria-hidden
            color="var(--mantine-color-orange-light-color)"
            style={iconSizes.xs}
          />
          <Text component="output" size="xs" c="var(--mantine-color-text)" style={{ whiteSpace: "nowrap" }}>
            {compactStaleWarning}
          </Text>
        </Group>
      )}
      {staleWarning && displayMode === "advanced" && (
        <Alert role="presentation" color="orange" icon={<IconAlertTriangle aria-hidden style={iconSizes.md} />} p="xs">
          <output>{staleWarning}</output>
        </Alert>
      )}
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <SimpleGrid cols={displayMode === "advanced" && width >= 760 ? 2 : 1} spacing="xs">
          {isPending ? (
            <Center mih={64} style={{ gridColumn: "1 / -1" }}>
              <Text size="sm" c="dimmed">
                {tCommon("action.loading")}
              </Text>
            </Center>
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <DepartureRow
                key={`${entry.timestamp.toISOString()}-${entry.location}`}
                entry={entry}
                dense={isDense}
                showLine={showLine}
                showPlatform={showPlatform}
                locale={locale}
              />
            ))
          ) : (
            <Center mih={64} style={{ gridColumn: "1 / -1" }}>
              <Text size="sm" c="dimmed">
                —
              </Text>
            </Center>
          )}
        </SimpleGrid>
      </ScrollArea>
      {displayMode === "advanced" && timetable && (
        <Text size="xs" c="dimmed" ta="right">
          {formatLocalizedTime(timetable.timestamp, locale, { includeSeconds: true })}
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

function DepartureRow({
  entry,
  dense,
  showLine,
  showPlatform,
  locale,
}: {
  entry: TimetableEntryView;
  dense: boolean;
  showLine: boolean;
  showPlatform: boolean;
  locale: string;
}) {
  return (
    <Group justify="space-between" w="100%" wrap="nowrap">
      <Group gap={dense ? 6 : "sm"} wrap="nowrap" style={{ minWidth: 0 }}>
        {showLine && entry.line && (
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
        <Text size={dense ? "xs" : "sm"} fw={dense ? 600 : undefined} style={{ whiteSpace: "nowrap" }}>
          {formatLocalizedTime(entry.timestamp, locale)}{" "}
          {entry.delay >= 1 && (
            <Text size={dense ? "xs" : "sm"} span c="red">
              +{entry.delay}&apos;
            </Text>
          )}
        </Text>
        <Text size={dense ? "xs" : "sm"} truncate>
          {entry.location}
        </Text>
      </Group>

      {showPlatform && entry.platform && (
        <Text size={dense ? "xs" : "sm"} c={entry.platform.hasChanged ? "red" : undefined} style={{ flexShrink: 0 }}>
          {entry.platform.name}
        </Text>
      )}
    </Group>
  );
}
