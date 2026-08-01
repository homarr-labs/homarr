"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Group, Loader, Stack, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import timezones from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { clientApi } from "@homarr/api/client";
import { metricToImperial } from "@homarr/common";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { AnimatedWeatherIcon } from "../weather/animated-icon";
import { WeatherDescription } from "../weather/icon";

dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezones);

export default function ClockWidget({ options, width, height, displayMode }: WidgetComponentProps<"clock">) {
  const isAdvanced = displayMode === "advanced";
  const secondsFormat = options.showSeconds || isAdvanced ? ":ss" : "";
  const timeFormat = options.is24HourFormat ? `HH:mm${secondsFormat}` : `hh:mm${secondsFormat} A`;
  const dateFormat = options.dateFormat;
  const customTimeFormat = options.customTimeFormat;
  const customDateFormat = options.customDateFormat;
  const timezone = options.useCustomTimezone ? options.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = useCurrentTime({ showSeconds: options.showSeconds || isAdvanced });
  const zonedTime = time === null ? null : dayjs(time).tz(timezone);

  const minimumAxis = Math.min(width, height * 1.5);
  const sizing = minimumAxis < 128 ? "xs" : minimumAxis < 196 ? "sm" : "md";
  const showWeatherCorner = options.showWeather && sizing !== "xs";

  return (
    <Box className="clock-widget-container" h="100%" pos="relative">
      {showWeatherCorner && (
        <ClockWeatherCorner
          latitude={options.weatherLocation.latitude}
          longitude={options.weatherLocation.longitude}
          locationName={options.weatherLocation.name}
          isFahrenheit={options.isWeatherFormatFahrenheit}
          showDetails={isAdvanced}
        />
      )}
      <Stack className="clock-text-stack" h="100%" align="center" justify="center" gap={sizing}>
        {options.customTitleToggle && (
          <Text className="clock-customTitle-text" size={sizing} ta="center">
            {options.customTitle}
          </Text>
        )}
        <Title className="clock-time-text" fw={700} order={sizing === "md" ? 2 : sizing === "sm" ? 4 : 6} lh="1">
          <time dateTime={zonedTime?.toISOString()}>
            {zonedTime === null ? "--:--" : zonedTime.format(options.customTimeFormat ? customTimeFormat : timeFormat)}
          </time>
        </Title>
        {(isAdvanced || options.showDate) && (
          <Text className="clock-date-text" size={sizing} lineClamp={1}>
            {zonedTime?.format(options.customDateFormat ? customDateFormat : dateFormat)}
          </Text>
        )}
        {isAdvanced && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {zonedTime === null ? null : `${timezone} · UTC${zonedTime.format("Z")}`}
          </Text>
        )}
      </Stack>
    </Box>
  );
}

interface ClockWeatherCornerProps {
  latitude: number;
  longitude: number;
  locationName: string;
  isFahrenheit: boolean;
  showDetails: boolean;
}

const ClockWeatherCorner = ({
  latitude,
  longitude,
  locationName,
  isFahrenheit,
  showDetails,
}: ClockWeatherCornerProps) => {
  const t = useI18n();
  const tCommon = useScopedI18n("common");
  const weatherQuery = clientApi.widget.weather.atLocation.useQuery({ latitude, longitude });
  const weather = weatherQuery.data;

  if (!weather) {
    return (
      <Box pos="absolute" top={4} left={4}>
        {isInitialWidgetQueryPending(weatherQuery) ? (
          <Loader size="xs" aria-label={tCommon("action.loading")} />
        ) : (
          <WidgetQueryErrorIndicator error={weatherQuery.error} label={t("widget.weather.name")} />
        )}
      </Box>
    );
  }

  const temp = isFahrenheit ? weather.current.temperature * (9 / 5) + 32 : weather.current.temperature;
  const unit = isFahrenheit ? "°F" : "°C";
  const today = weather.daily[0];
  const formatTemperature = (value: number | undefined) => {
    if (value === undefined) return "—";
    const preferred = isFahrenheit ? value * (9 / 5) + 32 : value;
    return `${Math.round(preferred)}${unit}`;
  };

  return (
    <Stack
      className="clock-weather-corner"
      pos="absolute"
      top={4}
      left={4}
      gap={showDetails ? 4 : 0}
      align="flex-start"
    >
      <Group gap={4} wrap="nowrap">
        <AnimatedWeatherIcon code={weather.current.weathercode} size={22} />
        <Text className="clock-weather-corner-temp" size="xs" c="dimmed">
          {Math.round(temp)}
          {unit}
        </Text>
        {showDetails && <WeatherDescription weatherOnly weatherCode={weather.current.weathercode} />}
      </Group>
      {showDetails && (
        <Stack gap={1}>
          <Text size="xs" fw={600}>
            {locationName}
          </Text>
          <Text size="xs" c="dimmed">
            {formatTemperature(today?.maxTemp)} / {formatTemperature(today?.minTemp)} · {today?.humidity ?? "—"}%
          </Text>
          <Text size="xs" c="dimmed">
            {Math.round(isFahrenheit ? metricToImperial(weather.current.windspeed) : weather.current.windspeed)}{" "}
            {isFahrenheit ? tCommon("unit.speed.milesPerHour") : tCommon("unit.speed.kilometersPerHour")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("widget.weather.dailyForecast.sunrise")}: {formatClockWeatherTime(today?.sunrise)} ·{" "}
            {t("widget.weather.dailyForecast.sunset")}: {formatClockWeatherTime(today?.sunset)}
          </Text>
        </Stack>
      )}
      <WidgetQueryErrorIndicator error={weatherQuery.error} label={t("widget.weather.name")} />
    </Stack>
  );
};

const formatClockWeatherTime = (value: string | undefined) => value?.split("T")[1] ?? "—";

interface UseCurrentTimeProps {
  showSeconds: boolean;
}

const useCurrentTime = ({ showSeconds }: UseCurrentTimeProps) => {
  const [time, setTime] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(null);
  const intervalRef = useRef<NodeJS.Timeout>(null);
  const intervalMultiplier = useMemo(() => (showSeconds ? 1 : 60), [showSeconds]);

  useEffect(() => {
    setTime(new Date());
    timeoutRef.current = setTimeout(
      () => {
        setTime(new Date());

        intervalRef.current = setInterval(() => {
          setTime(new Date());
        }, intervalMultiplier * 1000);
      },
      intervalMultiplier * 1000 - (1000 * (showSeconds ? 0 : dayjs().second()) + dayjs().millisecond()),
    );

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMultiplier, showSeconds]);

  return time;
};
