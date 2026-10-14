import { Alert, Badge, Center, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { formatLocalizedTime } from "../common/locale";

export interface TimetableNativeViewProps {
  title: string;
  loadingLabel: string;
  entries: TimetableEntryView[];
  isPending: boolean;
  staleWarning?: string;
  compactStaleWarning?: string;
  timestamp?: string;
  locale: string;
  displayMode: "compact" | "advanced";
  width: number;
  height: number;
}

export const TimetableNativeView = ({
  title,
  loadingLabel,
  entries,
  isPending,
  staleWarning,
  compactStaleWarning,
  timestamp,
  locale,
  displayMode,
  width,
  height,
}: TimetableNativeViewProps) => {
  const isAdvanced = displayMode === "advanced";
  const isDense = !isAdvanced && (width < 300 || height < 160);

  return (
    <Stack w="100%" h="100%" gap={isDense ? 4 : "xs"} p={isDense ? "xs" : "sm"}>
      <Text fw={600} size={isDense ? "sm" : undefined} truncate="end">
        {title}
      </Text>
      {compactStaleWarning && displayMode === "compact" && (
        <Group gap={2} wrap="nowrap">
          <IconAlertTriangle
            aria-hidden
            size="var(--mantine-font-size-xs)"
            color="var(--mantine-color-orange-light-color)"
            style={{ flexShrink: 0 }}
          />
          <Text component="output" size="xs" c="var(--mantine-color-text)" style={{ whiteSpace: "nowrap" }}>
            {compactStaleWarning}
          </Text>
        </Group>
      )}
      {staleWarning && displayMode === "advanced" && (
        <Alert
          role="presentation"
          color="orange"
          icon={<IconAlertTriangle aria-hidden size="var(--mantine-font-size-md)" />}
          p="xs"
        >
          <output>{staleWarning}</output>
        </Alert>
      )}
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <SimpleGrid cols={displayMode === "advanced" && width >= 760 ? 2 : 1} spacing="xs">
          {isPending ? (
            <Center mih={64} style={{ gridColumn: "1 / -1" }}>
              <Text size="sm" c="dimmed">
                {loadingLabel}
              </Text>
            </Center>
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <DepartureRow
                key={`${entry.timestamp.toISOString()}-${entry.location}`}
                entry={entry}
                dense={isDense}
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
      {displayMode === "advanced" && timestamp !== undefined && (
        <Text size="xs" c="dimmed" ta="right">
          {timestamp}
        </Text>
      )}
    </Stack>
  );
};

export interface TimetableEntryView {
  timestamp: Date;
  delay: number;
  line: { name: string; color: string | null } | null;
  location: string;
  platform: { name: string; hasChanged: boolean } | null;
}

function DepartureRow({ entry, dense, locale }: { entry: TimetableEntryView; dense: boolean; locale: string }) {
  return (
    <Group justify="space-between" w="100%" wrap="nowrap">
      <Group gap={dense ? 6 : "sm"} wrap="nowrap" style={{ minWidth: 0 }}>
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

      {entry.platform && (
        <Text
          size={dense ? "xs" : "sm"}
          c={entry.platform.hasChanged ? "red" : undefined}
          maw="35%"
          truncate="end"
          style={{ flexShrink: 1, minWidth: 0 }}
        >
          {entry.platform.name}
        </Text>
      )}
    </Group>
  );
}
