import type { ReactNode } from "react";
import { Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconDroplets,
  IconGauge,
  IconSunHigh,
  IconSunrise,
  IconSunset,
  IconTemperature,
  IconWind,
} from "@tabler/icons-react";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetProps } from "../definition";
import { AnimatedWeatherIcon } from "./animated-icon";
import classes from "./component.module.css";
import type { DailyWeatherData } from "./format";
import { getPreferredDaylightDuration, getPreferredTime, getPreferredUnit, getPreferredWindSpeed } from "./format";
import { formatWeatherDate, getWeatherKind } from "./icon";

interface DailyWeatherDetailsProps {
  animateIcons: boolean;
  day: DailyWeatherData;
  disableTemperatureDecimals: boolean;
  isFahrenheit: boolean;
  dateFormat: WidgetProps<"weather">["options"]["dateFormat"];
  showHumidity: boolean;
  timeZone: string;
  useImperialSpeed: boolean;
}

interface DetailMetricProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

const DetailMetric = ({ icon, label, value }: DetailMetricProps) => (
  <Paper className={classes.detailMetric} p="xs" radius="md">
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <ThemeIcon variant="light" size={28} radius="md">
        {icon}
      </ThemeIcon>
      <Stack gap={0} miw={0}>
        <Text size="xs" c="dimmed" lh={1.25}>
          {label}
        </Text>
        <Text size="sm" fw={600} lh={1.35}>
          {value}
        </Text>
      </Stack>
    </Group>
  </Paper>
);

const SolarMetric = ({ icon, label, value }: DetailMetricProps) => (
  <Stack gap={2} align="center" ta="center">
    <ThemeIcon variant="transparent" color="yellow" size={22}>
      {icon}
    </ThemeIcon>
    <Text size="xs" c="dimmed">
      {label}
    </Text>
    <Text size="sm" fw={600}>
      {value}
    </Text>
  </Stack>
);

export const DailyWeatherDetails = ({
  animateIcons,
  day,
  dateFormat,
  disableTemperatureDecimals,
  isFahrenheit,
  showHumidity,
  timeZone,
  useImperialSpeed,
}: DailyWeatherDetailsProps) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.weather");
  const tCommon = useI18n("common");
  const speedUnit = useImperialSpeed ? tCommon("unit.speed.milesPerHour") : tCommon("unit.speed.kilometersPerHour");

  return (
    <Stack gap="sm" className={classes.dailyDetails}>
      <Group justify="space-between" align="center" gap="md" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <ThemeIcon variant="light" size={46} radius="xl">
            <AnimatedWeatherIcon animated={animateIcons} code={day.weatherCode} size={28} />
          </ThemeIcon>
          <Stack gap={0} miw={0}>
            <Text fw={700} truncate>
              {formatWeatherDate(day.date, locale, dateFormat)}
            </Text>
            <Text size="sm" c="dimmed">
              {t(`kind.${getWeatherKind(day.weatherCode)}`)}
            </Text>
          </Stack>
        </Group>
        <Text size="sm" fw={600} ta="right" className={classes.dailyDetailsTemperature}>
          {t("advanced.highLow", {
            maximum: getPreferredUnit(day.maxTemperature, isFahrenheit, disableTemperatureDecimals),
            minimum: getPreferredUnit(day.minTemperature, isFahrenheit, disableTemperatureDecimals),
          })}
        </Text>
      </Group>

      <SimpleGrid cols={2} spacing={6}>
        <DetailMetric
          icon={<IconTemperature size={16} aria-hidden />}
          label={t("advanced.detailLabel.feelsLike")}
          value={`${getPreferredUnit(day.maxApparentTemperature, isFahrenheit, disableTemperatureDecimals)} / ${getPreferredUnit(day.minApparentTemperature, isFahrenheit, disableTemperatureDecimals)}`}
        />
        <DetailMetric
          icon={<IconDroplets size={16} aria-hidden />}
          label={t("advanced.detailLabel.precipitation")}
          value={`${day.precipitationProbability ?? "?"}% · ${day.precipitation?.toFixed(1) ?? "?"} mm`}
        />
        {showHumidity && (
          <DetailMetric
            icon={<IconGauge size={16} aria-hidden />}
            label={t("advanced.detailLabel.humidity")}
            value={`${day.averageHumidity ?? "?"}%`}
          />
        )}
        <DetailMetric
          icon={<IconWind size={16} aria-hidden />}
          label={t("advanced.detailLabel.wind")}
          value={`${getPreferredWindSpeed(day.maxWindSpeed, useImperialSpeed)} / ${getPreferredWindSpeed(day.maxWindGusts, useImperialSpeed)} ${speedUnit}`}
        />
        <DetailMetric
          icon={<IconSunHigh size={16} aria-hidden />}
          label={t("advanced.detailLabel.uv")}
          value={day.uvIndex?.toFixed(1) ?? "?"}
        />
      </SimpleGrid>

      <Paper className={classes.solarDetails} p="xs" radius="md">
        <SimpleGrid cols={3} spacing="xs">
          <SolarMetric
            icon={<IconSunrise size={17} aria-hidden />}
            label={t("dailyForecast.sunrise")}
            value={getPreferredTime(day.sunriseAt, locale, timeZone)}
          />
          <SolarMetric
            icon={<IconSunset size={17} aria-hidden />}
            label={t("dailyForecast.sunset")}
            value={getPreferredTime(day.sunsetAt, locale, timeZone)}
          />
          <SolarMetric
            icon={<IconSunHigh size={17} aria-hidden />}
            label={t("advanced.detailLabel.daylight")}
            value={getPreferredDaylightDuration(day.daylightDuration)}
          />
        </SimpleGrid>
      </Paper>
    </Stack>
  );
};
