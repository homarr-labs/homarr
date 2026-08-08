"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Loader, Stack, Text, Title } from "@mantine/core";
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

dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezones);

export default function ClockWidget({ options, width, height, displayMode }: WidgetComponentProps<"clock">) {
  const secondsFormat = options.showSeconds ? ":ss" : "";
  const timeFormat = options.is24HourFormat ? `HH:mm${secondsFormat}` : `hh:mm${secondsFormat} A`;
  const dateFormat = options.dateFormat;
  const customTimeFormat = options.customTimeFormat;
  const customDateFormat = options.customDateFormat;
  const timezone = options.useCustomTimezone ? options.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = useCurrentTime(options);

  const minimumAxis = Math.min(width, height * 1.5);
  const sizing = minimumAxis < 128 ? "xs" : minimumAxis < 196 ? "sm" : "md";
  const showWeatherCorner = options.showWeather && sizing !== "xs";

  return (
    <Box className="clock-widget-container" h="100%" pos="relative">
      {showWeatherCorner && (
        <ClockWeatherCorner
          latitude={options.weatherLocation.latitude}
          longitude={options.weatherLocation.longitude}
          isFahrenheit={options.isWeatherFormatFahrenheit}
          showDetails={displayMode === "advanced"}
        />
      )}
      <Stack className="clock-text-stack" h="100%" align="center" justify="center" gap={sizing}>
        {options.customTitleToggle && (
          <Text className="clock-customTitle-text" size={sizing} ta="center">
            {options.customTitle}
          </Text>
        )}
        <Title className="clock-time-text" fw={700} order={sizing === "md" ? 2 : sizing === "sm" ? 4 : 6} lh="1">
          <time dateTime={dayjs(time).tz(timezone).toISOString()}>
            {options.customTimeFormat
              ? dayjs(time).tz(timezone).format(customTimeFormat)
              : dayjs(time).tz(timezone).format(timeFormat)}
          </time>
        </Title>
        {options.showDate && (
          <Text className="clock-date-text" size={sizing} lineClamp={1}>
            {options.customDateFormat
              ? dayjs(time).tz(timezone).format(customDateFormat)
              : dayjs(time).tz(timezone).format(dateFormat)}
          </Text>
        )}
        {displayMode === "advanced" && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {timezone} · UTC{dayjs(time).tz(timezone).format("Z")}
          </Text>
        )}
      </Stack>
    </Box>
  );
}

interface ClockWeatherCornerProps {
  latitude: number;
  longitude: number;
  isFahrenheit: boolean;
  showDetails: boolean;
}

const ClockWeatherCorner = ({ latitude, longitude, isFahrenheit, showDetails }: ClockWeatherCornerProps) => {
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

  return (
    <Stack className="clock-weather-corner" pos="absolute" top={4} left={4} gap={0} align="center">
      <AnimatedWeatherIcon code={weather.current.weathercode} size={22} />
      <Text className="clock-weather-corner-temp" size="xs" c="dimmed">
        {Math.round(temp)}
        {unit}
      </Text>
      {showDetails && (
        <Text size="xs" c="dimmed">
          {Math.round(isFahrenheit ? metricToImperial(weather.current.windspeed) : weather.current.windspeed)}{" "}
          {isFahrenheit ? tCommon("unit.speed.milesPerHour") : tCommon("unit.speed.kilometersPerHour")}
        </Text>
      )}
      <WidgetQueryErrorIndicator error={weatherQuery.error} label={t("widget.weather.name")} />
    </Stack>
  );
};

interface UseCurrentTimeProps {
  showSeconds: boolean;
}

const useCurrentTime = ({ showSeconds }: UseCurrentTimeProps) => {
  const [time, setTime] = useState(new Date());
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
