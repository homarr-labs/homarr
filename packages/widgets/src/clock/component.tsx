"use client";

import { Box, Center, Stack, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";

import type { WidgetComponentProps } from "../definition";
import { AdvancedClockView } from "./advanced-view";
import { clockTimeFormatShowsSeconds, resolveClockTimeFormat } from "./format";
import { useCurrentTime } from "./use-current-time";
import { ClockWeatherSummary } from "./weather-summary";
import { getResolvedLocalTimeZone, isTimeZoneSupported } from "./world-clock";

dayjs.extend(advancedFormat);

export default function ClockWidget({ options, width, height, displayMode }: WidgetComponentProps<"clock">) {
  const isAdvanced = displayMode === "advanced";
  const showSeconds = clockTimeFormatShowsSeconds(options.customTimeFormat);
  const time = useCurrentTime({ showSeconds });
  const requestedTimeZone = options.useCustomTimezone ? options.timezone : getResolvedLocalTimeZone();
  const primaryTimeZoneInvalid = !isTimeZoneSupported(requestedTimeZone);
  const primaryTimeZone = primaryTimeZoneInvalid ? "UTC" : requestedTimeZone;
  const zonedTime = time === null ? null : dayjs(time).tz(primaryTimeZone);

  if (isAdvanced) {
    if (time && zonedTime) {
      return (
        <AdvancedClockView
          now={time}
          options={options}
          primaryTime={zonedTime}
          primaryTimeZone={primaryTimeZone}
          primaryTimeZoneInvalid={primaryTimeZoneInvalid}
        />
      );
    }
    return <Center h="100%">--:--</Center>;
  }

  const resolvedTimeFormat = resolveClockTimeFormat(options.customTimeFormat, options.is24HourFormat);
  const minimumAxis = Math.min(width, height * 1.5);
  let sizing: "xs" | "sm" | "md" = "md";
  if (minimumAxis < 128) sizing = "xs";
  else if (minimumAxis < 196) sizing = "sm";
  const showWeatherCorner = options.showWeather && sizing !== "xs";

  return (
    <Box className="clock-widget-container" h="100%" pos="relative">
      {showWeatherCorner && (
        <Box pos="absolute" top={2} left={4}>
          <ClockWeatherSummary
            latitude={options.weatherLocation.latitude}
            longitude={options.weatherLocation.longitude}
            locationName={options.weatherLocation.name}
            isFahrenheit={options.isWeatherFormatFahrenheit}
            animateIcon={options.animateWeatherIcon}
            colorByDayNight={options.colorWeatherByDayNight}
            dayColor={options.dayWeatherColor}
            nightColor={options.nightWeatherColor}
            detailed={false}
          />
        </Box>
      )}
      <Stack className="clock-text-stack" h="100%" align="center" justify="center" gap={sizing}>
        {options.customTitleToggle && (
          <Text className="clock-customTitle-text" size={sizing} ta="center">
            {options.customTitle}
          </Text>
        )}
        <Title className="clock-time-text" fw={700} order={getTitleOrder(sizing)} lh="1">
          <time dateTime={zonedTime?.toISOString()}>
            {zonedTime === null ? "--:--" : zonedTime.format(resolvedTimeFormat)}
          </time>
        </Title>
        {options.showDate && (
          <Text className="clock-date-text" size={sizing} lineClamp={1}>
            {zonedTime?.format(options.dateFormat)}
          </Text>
        )}
      </Stack>
    </Box>
  );
}

const getTitleOrder = (sizing: "xs" | "sm" | "md") => {
  if (sizing === "md") return 2;
  if (sizing === "sm") return 4;
  return 6;
};
