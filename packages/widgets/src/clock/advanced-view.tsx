import {
  Alert,
  Badge,
  Box,
  Divider,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconAlertTriangle, IconClock } from "@tabler/icons-react";
import type { Dayjs } from "dayjs";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { formatLocalizedDate, formatLocalizedTime } from "../common/locale";
import type { WidgetComponentProps } from "../definition";
import { clockTimeFormatShowsSeconds, clockTimeFormatUses12Hours, resolveClockTimeFormat } from "./format";
import { TimeOfDayBar } from "./time-of-day-bar";
import { ClockWeatherSummary } from "./weather-summary";
import {
  createWorldClockTime,
  formatRelativeOffset,
  formatUtcOffset,
  getTimeOfDayPhase,
  humanizeTimeZone,
  maximumWorldClockCities,
} from "./world-clock";
import type { TimeOfDayPhase, WorldClockTime } from "./world-clock";

interface AdvancedClockViewProps {
  now: Date;
  options: WidgetComponentProps<"clock">["options"];
  primaryTime: Dayjs;
  primaryTimeZone: string;
  primaryTimeZoneInvalid: boolean;
}

export const AdvancedClockView = ({
  now,
  options,
  primaryTime,
  primaryTimeZone,
  primaryTimeZoneInvalid,
}: AdvancedClockViewProps) => {
  const t = useI18n("widget.clock");
  const primaryLabel = getPrimaryLabel(options, t);
  const primary: WorldClockTime = {
    id: "primary",
    label: primaryLabel,
    timeZone: primaryTimeZone,
    zonedTime: primaryTime,
    phase: getTimeOfDayPhase(primaryTime.hour()),
    minuteOfDay: primaryTime.hour() * 60 + primaryTime.minute() + primaryTime.second() / 60,
    utcOffset: primaryTime.utcOffset(),
    dayDifference: 0,
  };
  const cities = options.worldClockCities
    .slice(0, maximumWorldClockCities)
    .filter(({ timeZone }) => timeZone !== primaryTimeZone)
    .map((city) => createWorldClockTime({ city, now, primaryTime }));

  return (
    <ScrollArea
      h="100%"
      w="100%"
      aria-label={t("worldClock.advancedLabel")}
    >
      <Stack gap="md" p={{ base: "sm", sm: "md" }}>
        {primaryTimeZoneInvalid && (
          <Alert icon={<IconAlertTriangle />} color="yellow" title={t("worldClock.unsupportedPrimaryTitle")}>
            {t("worldClock.unsupportedPrimary", { timeZone: options.timezone })}
          </Alert>
        )}
        <PrimaryClock now={now} options={options} primary={primary} />
        <OverviewMode now={now} options={options} primary={primary} cities={cities} />
      </Stack>
    </ScrollArea>
  );
};

interface ModeProps {
  now: Date;
  options: WidgetComponentProps<"clock">["options"];
  primary: WorldClockTime;
  cities: WorldClockTime[];
}

const PrimaryClock = ({ now, options, primary }: Pick<ModeProps, "now" | "options" | "primary">) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.clock");
  const primaryTime = primary.zonedTime;
  if (!primaryTime || primary.phase === null || primary.minuteOfDay === null) return null;

  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start" gap="lg" wrap="wrap">
        <Stack gap={5} miw={0}>
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon color={getPhaseColor(primary.phase)} variant="light" radius="xl" size="md">
              <IconClock style={iconSizes.md} />
            </ThemeIcon>
            <Title order={2} size="h4" fw={600}>
              {primary.label}
            </Title>
          </Group>
          <ClockTime entry={primary} now={now} options={options} primary />
          {options.showDate && (
            <Text size="sm" c="dimmed">
              {formatLocalizedDate(now, locale, { dateStyle: "full", timeZone: primary.timeZone })}
            </Text>
          )}
          <Group gap="xs" wrap="wrap">
            <Badge color="gray" variant="light" tt="none">
              {primary.timeZone}
            </Badge>
            <Badge color="gray" variant="outline" tt="none">
              {formatUtcOffset(primaryTime.utcOffset())}
            </Badge>
          </Group>
        </Stack>
        {options.showWeather && (
          <Paper withBorder radius="md" p="sm">
            <ClockWeatherSummary
              latitude={options.weatherLocation.latitude}
              longitude={options.weatherLocation.longitude}
              locationName={options.weatherLocation.name}
              isFahrenheit={options.isWeatherFormatFahrenheit}
              animateIcon={options.animateWeatherIcon}
              colorByDayNight={options.colorWeatherByDayNight}
              dayColor={options.dayWeatherColor}
              nightColor={options.nightWeatherColor}
              detailed
            />
          </Paper>
        )}
      </Group>
      <Divider my="sm" />
      <TimeOfDayBar
        minuteOfDay={primary.minuteOfDay}
        phase={primary.phase}
        showLegend
        showTicks
        label={t("worldClock.timeBarLabel", { city: primary.label })}
      />
    </Paper>
  );
};

const OverviewMode = ({ now, options, primary, cities }: ModeProps) => {
  const t = useI18n("widget.clock");
  if (cities.length === 0) return <EmptyCities />;

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="baseline">
        <Title order={3} size="h5">
          {t("worldClock.cities")}
        </Title>
        <Text size="xs" c="dimmed">
          {t("worldClock.cityCount", { count: cities.length })}
        </Text>
      </Group>
      <SimpleGrid component="ul" cols={{ base: 1, sm: 2 }} spacing="sm" p={0} m={0} style={{ listStyle: "none" }}>
        {cities.map((city) => (
          <WorldClockCard
            key={city.id}
            entry={city}
            now={now}
            options={options}
            primaryOffset={primary.utcOffset ?? 0}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
};

interface ClockEntryProps {
  entry: WorldClockTime;
  now: Date;
  options: WidgetComponentProps<"clock">["options"];
  primaryOffset: number;
}

const WorldClockCard = ({ entry, now, options, primaryOffset }: ClockEntryProps) => {
  if (!entry.zonedTime || entry.utcOffset === null) {
    return <InvalidTimeZone entry={entry} />;
  }

  return (
    <Paper component="li" withBorder radius="md" p="md">
      <Stack gap="sm">
        <Stack gap={0} miw={0}>
          <Text fw={600} truncate>
            {entry.label}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {entry.timeZone}
          </Text>
        </Stack>
        <ClockTime entry={entry} now={now} options={options} compact />
        <DayAndOffset entry={entry} now={now} primaryOffset={primaryOffset} />
      </Stack>
    </Paper>
  );
};

const ClockTime = ({
  entry,
  now,
  options,
  primary = false,
  compact = false,
}: Omit<ClockEntryProps, "primaryOffset"> & { primary?: boolean; compact?: boolean }) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.clock");
  if (!entry.zonedTime) return null;
  let formattedTime = formatLocalizedTime(now, locale, {
    hour12: clockTimeFormatUses12Hours(options.customTimeFormat, options.is24HourFormat),
    includeSeconds: clockTimeFormatShowsSeconds(options.customTimeFormat),
    timeZone: entry.timeZone,
  });
  if (primary) {
    formattedTime = entry.zonedTime.format(resolveClockTimeFormat(options.customTimeFormat, options.is24HourFormat));
  }
  const accessibleDate = formatLocalizedDate(now, locale, {
    dateStyle: "medium",
    timeZone: entry.timeZone,
  });
  const fontSize = compact ? { base: 30, sm: 34 } : { base: 44, sm: 56 };

  return (
    <Text
      component="time"
      dateTime={now.toISOString()}
      fz={fontSize}
      fw={700}
      ff="var(--mantine-font-family-monospace)"
      lh={1}
      lts="-0.04em"
      aria-label={t("worldClock.accessibleTime", {
        city: entry.label,
        time: formattedTime,
        date: accessibleDate,
        timeZone: entry.timeZone,
      })}
    >
      {formattedTime}
    </Text>
  );
};

const DayAndOffset = ({ entry, now, primaryOffset }: Pick<ClockEntryProps, "entry" | "now" | "primaryOffset">) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.clock");
  if (entry.dayDifference === null || entry.utcOffset === null) return null;
  const dayRelation = getDayRelation(entry.dayDifference, t);
  const date = formatLocalizedDate(now, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: entry.timeZone,
  });

  return (
    <Group gap="xs" wrap="wrap">
      <Badge color="gray" variant="light" size="sm" tt="none">
        {date} · {dayRelation}
      </Badge>
      <Text size="xs" c="dimmed">
        {formatRelativeOffset(entry.utcOffset - primaryOffset)} · {formatUtcOffset(entry.utcOffset)}
      </Text>
    </Group>
  );
};

const InvalidTimeZone = ({ entry }: { entry: WorldClockTime }) => {
  const t = useI18n("widget.clock");
  return (
    <Paper component="li" withBorder radius="md" p="md">
      <Group gap="xs" wrap="nowrap">
        <IconAlertTriangle color="var(--mantine-color-yellow-6)" aria-hidden />
        <Box>
          <Text fw={600}>{entry.label}</Text>
          <Text size="xs" c="dimmed">
            {t("worldClock.unsupportedTimeZone", { timeZone: entry.timeZone })}
          </Text>
        </Box>
      </Group>
    </Paper>
  );
};

const EmptyCities = () => {
  const t = useI18n("widget.clock");
  return (
    <Paper withBorder radius="md" p="xl">
      <Text c="dimmed" ta="center">
        {t("worldClock.noSecondaryCities")}
      </Text>
    </Paper>
  );
};

type ScopedClockTranslator = ReturnType<typeof useI18n<"widget.clock">>;

const getDayRelation = (difference: number, t: ScopedClockTranslator) => {
  if (difference < 0) return t("worldClock.yesterday");
  if (difference > 0) return t("worldClock.tomorrow");
  return t("worldClock.today");
};

const getPrimaryLabel = (options: ModeProps["options"], t: ScopedClockTranslator) => {
  if (options.customTitleToggle) return options.customTitle || t("worldClock.primary");
  if (options.useCustomTimezone) return humanizeTimeZone(options.timezone);
  return t("worldClock.local");
};

const getPhaseColor = (phase: TimeOfDayPhase) => {
  if (phase === "night") return "indigo";
  if (phase === "dawn") return "orange";
  if (phase === "day") return "cyan";
  return "grape";
};
