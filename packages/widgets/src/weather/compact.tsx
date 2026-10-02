import { useMemo } from "react";
import { Group, Popover, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight, IconDroplets, IconMapPin, IconWind } from "@tabler/icons-react";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import type { WidgetProps } from "../definition";
import { AnimatedWeatherIcon } from "./animated-icon";
import classes from "./component.module.css";
import { DailyWeatherDetails } from "./details";
import type { WeatherData } from "./format";
import { getPreferredDate, getPreferredUnit, getPreferredWindSpeed } from "./format";
import { formatWeatherDate, WeatherDescription } from "./icon";
import { getCompactWeatherLayout } from "./layout";

interface CompactWeatherProps {
  height: number;
  isEditMode: boolean;
  options: WidgetProps<"weather">["options"];
  weather: WeatherData;
  width: number;
}

export const CompactWeather = ({ height, isEditMode, options, weather, width }: CompactWeatherProps) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.weather");
  const tCommon = useI18n("common");
  const layout = useMemo(
    () => getCompactWeatherLayout(width, height, options.hasForecast, options.forecastDayCount),
    [height, options.forecastDayCount, options.hasForecast, width],
  );
  const today = weather.daily[0];
  const speedUnit = options.useImperialSpeed
    ? tCommon("unit.speed.milesPerHour")
    : tCommon("unit.speed.kilometersPerHour");
  const contentGap = layout.tier === "micro" ? 2 : 4;
  const contentPadding = layout.tier === "roomy" ? "xs" : 4;

  return (
    <Stack
      className={classes.compactRoot}
      data-tier={layout.tier}
      align="center"
      justify="center"
      gap={contentGap}
      h="100%"
      w="100%"
      p={contentPadding}
    >
      <Group className="weather-day-group" gap={layout.tier === "micro" ? 2 : "xs"} wrap="nowrap" justify="center">
        <Popover position="bottom" withArrow shadow="md">
          <Popover.Target>
            <UnstyledButton className={classes.detailsButton} aria-label={t("details")} disabled={isEditMode}>
              <AnimatedWeatherIcon
                animated={options.animateIcons}
                code={weather.current.weatherCode}
                isDay={weather.current.isDay}
                style={zoomCompensatedSize(layout.tier === "micro" ? 18 : 32)}
              />
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown>
            <WeatherDescription weatherOnly weatherCode={weather.current.weatherCode} />
          </Popover.Dropdown>
        </Popover>
        <Stack gap={0} align={layout.tier === "micro" ? "center" : "flex-start"}>
          <Text fz={layout.tier === "micro" ? 22 : 30} fw={600} lh={1.05}>
            {getPreferredUnit(
              weather.current.temperature,
              options.isFormatFahrenheit,
              options.disableTemperatureDecimals,
            )}
          </Text>
          {layout.showCondition && <WeatherDescription weatherOnly weatherCode={weather.current.weatherCode} />}
        </Stack>
      </Group>

      {layout.showHighLow && today && (
        <Group className="weather-max-min-temp-group" gap="sm" wrap="nowrap">
          <Group gap={3} wrap="nowrap">
            <IconArrowUpRight size="var(--mantine-font-size-md)" aria-hidden />
            <Text size="sm">
              {getPreferredUnit(today.maxTemperature, options.isFormatFahrenheit, options.disableTemperatureDecimals)}
            </Text>
          </Group>
          <Group gap={3} wrap="nowrap">
            <IconArrowDownRight size="var(--mantine-font-size-md)" aria-hidden />
            <Text size="sm">
              {getPreferredUnit(today.minTemperature, options.isFormatFahrenheit, options.disableTemperatureDecimals)}
            </Text>
          </Group>
        </Group>
      )}

      {layout.showSecondary && !options.hasForecast && (
        <Group className={classes.compactMetrics} gap="sm" justify="center" wrap="wrap">
          {options.showHumidity && (
            <Group className="weather-humidity-group" gap={4} wrap="nowrap">
              <IconDroplets size="var(--mantine-font-size-sm)" aria-hidden />
              <Text size="sm">{weather.current.relativeHumidity}%</Text>
            </Group>
          )}
          {options.showCurrentWindSpeed && (
            <Group className="weather-current-wind-speed-group" gap={4} wrap="nowrap">
              <IconWind size="var(--mantine-font-size-sm)" aria-hidden />
              <Text size="sm">
                {getPreferredWindSpeed(weather.current.windSpeed, options.useImperialSpeed)} {speedUnit}
              </Text>
            </Group>
          )}
        </Group>
      )}

      {layout.forecastDays > 0 && (
        <Group className="weather-forecast-days-group" w="100%" justify="space-evenly" wrap="nowrap" gap={2}>
          {weather.daily.slice(0, layout.forecastDays).map((day, index) => (
            <Popover key={day.date} position="bottom" withArrow shadow="md">
              <Popover.Target>
                <UnstyledButton
                  className={classes.forecastButton}
                  aria-label={t("detailsFor", {
                    date: formatWeatherDate(day.date, locale, options.dateFormat),
                  })}
                  disabled={isEditMode}
                >
                  <Stack
                    component="span"
                    className={`weather-forecast-day-stack weather-forecast-day${index}`}
                    gap={0}
                    align="center"
                  >
                    <Text component="span" size="sm" fw={600} tt="capitalize">
                      {getPreferredDate(day.date, locale, { weekday: "short" })}
                    </Text>
                    <AnimatedWeatherIcon
                      animated={options.animateIcons}
                      code={day.weatherCode}
                      style={zoomCompensatedSize(18)}
                    />
                    <Text component="span" size="sm">
                      {getPreferredUnit(
                        day.maxTemperature,
                        options.isFormatFahrenheit,
                        options.disableTemperatureDecimals,
                      )}
                    </Text>
                  </Stack>
                </UnstyledButton>
              </Popover.Target>
              <Popover.Dropdown className={classes.dailyDetailsDropdown}>
                <DailyWeatherDetails
                  animateIcons={options.animateIcons}
                  day={day}
                  dateFormat={options.dateFormat}
                  disableTemperatureDecimals={options.disableTemperatureDecimals}
                  isFahrenheit={options.isFormatFahrenheit}
                  showHumidity={options.showHumidity}
                  timeZone={weather.timezone}
                  useImperialSpeed={options.useImperialSpeed}
                />
              </Popover.Dropdown>
            </Popover>
          ))}
        </Group>
      )}

      {layout.showCity && options.showCity && (
        <Group className="weather-city-group" gap={4} wrap="nowrap" maw="100%">
          <IconMapPin size="var(--mantine-font-size-sm)" aria-hidden />
          <Text size="sm" truncate>
            {options.location.name}
          </Text>
        </Group>
      )}
    </Stack>
  );
};
