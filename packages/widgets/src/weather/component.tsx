"use client";

import { useId } from "react";
import { Box, Group, HoverCard, Stack, Table, Text } from "@mantine/core";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconDroplets,
  IconMapPin,
  IconSunrise,
  IconSunset,
  IconWind,
} from "@tabler/icons-react";
import combineClasses from "clsx";
import dayjs from "dayjs";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { metricToImperial } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { AnimatedWeatherIcon } from "./animated-icon";
import { WeatherDescription } from "./icon";

export default function WeatherWidget({
  isEditMode,
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"weather">) {
  const input = {
    latitude: options.location.latitude,
    longitude: options.location.longitude,
  };
  const { data: weather } = clientApi.widget.weather.atLocation.useQuery(input);

  if (!weather) return <WidgetEmptyState />;

  if (displayMode === "advanced") {
    return <AdvancedWeather weather={weather} options={options} />;
  }

  return (
    <Stack
      align="center"
      gap="sm"
      justify="center"
      w="100%"
      h="100%"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      {options.hasForecast ? (
        <WeeklyForecast
          weather={weather}
          options={options}
          maxDays={getVisibleForecastDays(options.forecastDayCount, width, height)}
        />
      ) : (
        <DailyWeather weather={weather} options={options} />
      )}
    </Stack>
  );
}

interface WeatherProps extends Pick<WidgetComponentProps<"weather">, "options"> {
  weather: RouterOutputs["widget"]["weather"]["atLocation"];
}

const AdvancedWeather = ({ options, weather }: WeatherProps) => {
  const forecastHeadingId = useId();
  const t = useScopedI18n("widget.weather");
  const tCommon = useScopedI18n("common");

  return (
    <Stack h="100%" w="100%" gap="sm" p="md" style={{ overflow: "hidden" }}>
      <Group justify="space-between" align="center" gap="sm" wrap="wrap">
        <Group gap="sm" wrap="nowrap">
          <AnimatedWeatherIcon size={42} code={weather.current.weathercode} />
          <Stack gap={0}>
            <Text fz="xl" fw={700} lh={1.1}>
              {getPreferredUnit(
                weather.current.temperature,
                options.isFormatFahrenheit,
                options.disableTemperatureDecimals,
              )}
            </Text>
            <WeatherDescription weatherOnly weatherCode={weather.current.weathercode} />
          </Stack>
        </Group>

        <Group gap="lg" wrap="wrap">
          <Group gap={5} wrap="nowrap">
            <IconMapPin size={16} aria-hidden />
            <Text size="sm">{options.location.name}</Text>
          </Group>
          <Group gap={5} wrap="nowrap">
            <IconWind size={16} aria-hidden />
            <Text size="sm">
              {t("currentWindSpeed", {
                currentWindSpeed: getPreferredWindSpeed(weather.current.windspeed, options.useImperialSpeed),
                unit: options.useImperialSpeed
                  ? tCommon("unit.speed.milesPerHour")
                  : tCommon("unit.speed.kilometersPerHour"),
              })}
            </Text>
          </Group>
        </Group>
      </Group>

      <Text id={forecastHeadingId} component="h3" size="sm" fw={600}>
        {t("advanced.forecast")}
      </Text>
      <Table.ScrollContainer
        minWidth={680}
        maxHeight="100%"
        style={{ flex: 1, minHeight: 0 }}
        scrollAreaProps={{ type: "auto", offsetScrollbars: "present" }}
      >
        <Table
          aria-labelledby={forecastHeadingId}
          striped
          highlightOnHover
          verticalSpacing="xs"
          horizontalSpacing="sm"
          stickyHeader
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("advanced.day")}</Table.Th>
              <Table.Th>{t("advanced.conditions")}</Table.Th>
              <Table.Th>{t("advanced.temperature")}</Table.Th>
              <Table.Th>{t("advanced.humidity")}</Table.Th>
              <Table.Th>
                {t("advanced.wind", {
                  unit: options.useImperialSpeed
                    ? tCommon("unit.speed.milesPerHour")
                    : tCommon("unit.speed.kilometersPerHour"),
                })}
              </Table.Th>
              <Table.Th>{t("advanced.sun")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {weather.daily.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text size="sm" c="dimmed" ta="center">
                    {t("advanced.noForecast")}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              weather.daily.map((dayWeather) => (
                <Table.Tr key={dayWeather.time}>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm" fw={600} tt="capitalize">
                        {dayjs(dayWeather.time).format("ddd")}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {dayjs(dayWeather.time).format("MMM D")}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <AnimatedWeatherIcon size={20} code={dayWeather.weatherCode} />
                      <WeatherDescription weatherOnly weatherCode={dayWeather.weatherCode} />
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <IconArrowUpRight size={15} aria-hidden />
                      <Text size="sm">
                        {getPreferredUnit(
                          dayWeather.maxTemp,
                          options.isFormatFahrenheit,
                          options.disableTemperatureDecimals,
                        )}
                      </Text>
                      <Text size="sm" c="dimmed">
                        /
                      </Text>
                      <IconArrowDownRight size={15} aria-hidden />
                      <Text size="sm">
                        {getPreferredUnit(
                          dayWeather.minTemp,
                          options.isFormatFahrenheit,
                          options.disableTemperatureDecimals,
                        )}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={5} wrap="nowrap">
                      <IconDroplets size={15} aria-hidden />
                      <Text size="sm">{dayWeather.humidity === undefined ? "?" : `${dayWeather.humidity}%`}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={5} wrap="nowrap">
                      <IconWind size={15} aria-hidden />
                      <Text size="sm">
                        {getPreferredWindSpeed(dayWeather.maxWindSpeed, options.useImperialSpeed)} /{" "}
                        {getPreferredWindSpeed(dayWeather.maxWindGusts, options.useImperialSpeed)}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Group gap={3} wrap="nowrap">
                        <IconSunrise size={15} aria-hidden />
                        <Text size="sm">{getPreferredTime(dayWeather.sunrise)}</Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        /
                      </Text>
                      <Group gap={3} wrap="nowrap">
                        <IconSunset size={15} aria-hidden />
                        <Text size="sm">{getPreferredTime(dayWeather.sunset)}</Text>
                      </Group>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
};

const DailyWeather = ({ options, weather }: WeatherProps) => {
  const t = useScopedI18n("widget.weather");
  const tCommon = useScopedI18n("common");

  return (
    <>
      <Group className="weather-day-group" gap="sm">
        <HoverCard>
          <HoverCard.Target>
            <Box>
              <AnimatedWeatherIcon size={30} code={weather.current.weathercode} />
            </Box>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <WeatherDescription weatherOnly weatherCode={weather.current.weathercode} />
          </HoverCard.Dropdown>
        </HoverCard>
        <Text fz={30}>
          {getPreferredUnit(
            weather.current.temperature,
            options.isFormatFahrenheit,
            options.disableTemperatureDecimals,
          )}
        </Text>
      </Group>
      <Stack gap="xs" align="center">
        {options.showCurrentWindSpeed && (
          <Group className="weather-current-wind-speed-group" wrap="nowrap" gap="xs">
            <IconWind size={16} />
            <Text fz={16}>
              {t("currentWindSpeed", {
                currentWindSpeed: (options.useImperialSpeed
                  ? metricToImperial(weather.current.windspeed)
                  : weather.current.windspeed
                ).toFixed(1),
                unit: options.useImperialSpeed
                  ? tCommon("unit.speed.milesPerHour")
                  : tCommon("unit.speed.kilometersPerHour"),
              })}
            </Text>
          </Group>
        )}
        {weather.daily[0]?.humidity !== undefined && (
          <Group className="weather-humidity-group" wrap="nowrap" gap="xs">
            <IconDroplets size={16} />
            <Text fz={16}>{t("dailyForecast.humidity", { humidity: weather.daily[0].humidity })}</Text>
          </Group>
        )}
        <Group className="weather-max-min-temp-group" wrap="nowrap" gap="sm">
          <Group gap="xs" wrap="nowrap">
            <IconArrowUpRight size={16} />
            <Text fz={16}>
              {getPreferredUnit(
                weather.daily[0]?.maxTemp,
                options.isFormatFahrenheit,
                options.disableTemperatureDecimals,
              )}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <IconArrowDownRight size={16} />
            <Text fz={16}>
              {getPreferredUnit(
                weather.daily[0]?.minTemp,
                options.isFormatFahrenheit,
                options.disableTemperatureDecimals,
              )}
            </Text>
          </Group>
        </Group>
      </Stack>
      {options.showCity && (
        <>
          <Group className="weather-city-group" wrap="nowrap" gap="xs">
            <IconMapPin size={16} />
            <Text fz={16} style={{ whiteSpace: "nowrap" }}>
              {options.location.name}
            </Text>
          </Group>
        </>
      )}
    </>
  );
};

const WeeklyForecast = ({ options, weather, maxDays }: WeatherProps & { maxDays: number }) => {
  return (
    <>
      <Group className="weather-forecast-city-temp-group" wrap="nowrap" gap="md">
        {options.showCity && (
          <Group gap="xs" wrap="nowrap">
            <IconMapPin size={16} />
            <Text fz={16} style={{ whiteSpace: "nowrap" }}>
              {options.location.name}
            </Text>
          </Group>
        )}
        <Group gap="xs" wrap="nowrap">
          <HoverCard>
            <HoverCard.Target>
              <Box>
                <AnimatedWeatherIcon size={16} code={weather.current.weathercode} />
              </Box>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <WeatherDescription weatherOnly weatherCode={weather.current.weathercode} />
            </HoverCard.Dropdown>
          </HoverCard>
          <Text fz={16}>
            {getPreferredUnit(
              weather.current.temperature,
              options.isFormatFahrenheit,
              options.disableTemperatureDecimals,
            )}
          </Text>
        </Group>
      </Group>
      <Forecast weather={weather} options={options} maxDays={maxDays} />
    </>
  );
};

function Forecast({ weather, options, maxDays }: WeatherProps & { maxDays: number }) {
  const dateFormat = options.dateFormat;
  return (
    <Group className="weather-forecast-days-group" w="100%" justify="space-evenly" wrap="nowrap" pb="sm">
      {weather.daily.slice(0, maxDays).map((dayWeather, index) => (
        <HoverCard key={dayWeather.time} withArrow shadow="md">
          <HoverCard.Target>
            <Stack
              className={combineClasses(
                "weather-forecast-day-stack",
                `weather-forecast-day${index}`,
                `weather-forecast-weekday${dayjs(dayWeather.time).day()}`,
              )}
              gap="0"
              align="center"
            >
              <Text fz="xl">{dayjs(dayWeather.time).format("dd")}</Text>
              <AnimatedWeatherIcon size={16} code={dayWeather.weatherCode} />
              <Text fz={16}>
                {getPreferredUnit(dayWeather.maxTemp, options.isFormatFahrenheit, options.disableTemperatureDecimals)}
              </Text>
            </Stack>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <WeatherDescription
              useImperialSpeed={options.useImperialSpeed}
              dateFormat={dateFormat}
              time={dayWeather.time}
              weatherCode={dayWeather.weatherCode}
              maxTemp={getPreferredUnit(
                dayWeather.maxTemp,
                options.isFormatFahrenheit,
                options.disableTemperatureDecimals,
              )}
              minTemp={getPreferredUnit(
                dayWeather.minTemp,
                options.isFormatFahrenheit,
                options.disableTemperatureDecimals,
              )}
              sunrise={dayjs(dayWeather.sunrise).format("HH:mm")}
              sunset={dayjs(dayWeather.sunset).format("HH:mm")}
              maxWindSpeed={dayWeather.maxWindSpeed}
              maxWindGusts={dayWeather.maxWindGusts}
              humidity={dayWeather.humidity}
            />
          </HoverCard.Dropdown>
        </HoverCard>
      ))}
    </Group>
  );
}

export const getPreferredUnit = (value?: number, isFahrenheit = false, disableTemperatureDecimals = false): string =>
  value !== undefined
    ? isFahrenheit
      ? `${(value * (9 / 5) + 32).toFixed(disableTemperatureDecimals ? 0 : 1)}°F`
      : `${value.toFixed(disableTemperatureDecimals ? 0 : 1)}°C`
    : "?";

export const getPreferredWindSpeed = (value: number | undefined, useImperialSpeed = false): string =>
  value === undefined ? "?" : (useImperialSpeed ? metricToImperial(value) : value).toFixed(1);

export const getPreferredTime = (value: string | undefined): string => {
  if (!value) return "?";
  const time = dayjs(value);
  return time.isValid() ? time.format("HH:mm") : "?";
};

export const getVisibleForecastDays = (configuredDays: number, width: number, height: number): number => {
  const widthBudget = Math.max(1, Math.floor(width / 58));
  const heightBudget = height < 120 ? 3 : configuredDays;
  return Math.min(configuredDays, widthBudget, heightBudget);
};
