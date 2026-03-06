import { Badge, Center, Group, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { DynamicSelectOption } from "../_inputs/widget-dynamic-select-input";
import type { WidgetComponentProps } from "../definition";

export default function TimetableWidget({ options, integrationIds }: WidgetComponentProps<"timetable">) {
  // It will always have at least one integration as otherwise the NoIntegrationSelectedError would be thrown in item-content.tsx
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const integrationId = integrationIds[0]!;
  const t = useScopedI18n("widget.timetable");

  if (!options.station) {
    return <Center h="100%">{t("noStation")}</Center>;
  }

  return <TimetableWidgetInner station={options.station} integrationId={integrationId} />;
}

interface TimetableWidgetInnerProps {
  station: DynamicSelectOption;
  integrationId: string;
}

const TimetableWidgetInner = ({ station, integrationId }: TimetableWidgetInnerProps) => {
  const [timetable] = clientApi.widget.timetable.getTimetable.useSuspenseQuery({
    integrationId,
    stationId: station.value,
    limit: 10,
  });
  const t = useScopedI18n("widget.timetable");

  return (
    <Stack w="100%" gap="xs" p="sm">
      <Text fw="bold">{t("title", { station: station.label })}</Text>
      {timetable.entries.map((entry) => (
        <Group key={`${entry.timestamp.toISOString()}-${entry.location}`} justify="space-between" w="100%">
          <Group gap="sm">
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
            <Text size="sm">
              {dayjs(entry.timestamp).format("HH:mm")}{" "}
              {entry.delay >= 1 && (
                <Text size="sm" span c="red">
                  +{entry.delay}&apos;
                </Text>
              )}
            </Text>

            <Text size="sm">{entry.location}</Text>
          </Group>

          {entry.platform && (
            <Text size="sm" c={entry.platform.hasChanged ? "red" : undefined}>
              {entry.platform.name}
            </Text>
          )}
        </Group>
      ))}
    </Stack>
  );
};
