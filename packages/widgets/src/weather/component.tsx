"use client";

import { Box, Group, HoverCard, Stack, Text } from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight, IconDroplets, IconMapPin, IconWind } from "@tabler/icons-react";
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
          maxDays={getVisibleForecastDays(options.forecastDayCount, width, height, displayMode === "advanced")}
          showDetails={displayMode === "advanced"}
        />
      ) : (
        <DailyWeather weather={weather} options={options} showDetails={displayMode === "advanced"} />
      )}
    </Stack>
  );
}

interface WeatherProps extends Pick<WidgetComponentProps<"weather">, "options"> {
  weather: RouterOutputs["widget"]["weather"]["atLocation"];
}

const DailyWeather = ({ options, weather, showDetails = false }: WeatherProps & { showDetails?: boolean }) => {
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
      {showDetails && weather.daily[0] && (
        <WeatherDescription
          useImperialSpeed={options.useImperialSpeed}
          dateFormat={options.dateFormat}
          time={weather.daily[0].time}
          weatherCode={weather.daily[0].weatherCode}
          maxTemp={getPreferredUnit(
            weather.daily[0].maxTemp,
            options.isFormatFahrenheit,
            options.disableTemperatureDecimals,
          )}
          minTemp={getPreferredUnit(
            weather.daily[0].minTemp,
            options.isFormatFahrenheit,
            options.disableTemperatureDecimals,
          )}
          sunrise={dayjs(weather.daily[0].sunrise).format("HH:mm")}
          sunset={dayjs(weather.daily[0].sunset).format("HH:mm")}
          maxWindSpeed={weather.daily[0].maxWindSpeed}
          maxWindGusts={weather.daily[0].maxWindGusts}
          humidity={weather.daily[0].humidity}
        />
      )}
    </>
  );
};

const WeeklyForecast = ({
  options,
  weather,
  maxDays,
  showDetails,
}: WeatherProps & { maxDays: number; showDetails: boolean }) => {
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
      <Forecast weather={weather} options={options} maxDays={maxDays} showDetails={showDetails} />
    </>
  );
};

function Forecast({
  weather,
  options,
  maxDays,
  showDetails,
}: WeatherProps & { maxDays: number; showDetails: boolean }) {
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
              {showDetails && (
                <Text fz="xs" c="dimmed">
                  {getPreferredUnit(dayWeather.minTemp, options.isFormatFahrenheit, true)}
                </Text>
              )}
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

export const getVisibleForecastDays = (
  configuredDays: number,
  width: number,
  height: number,
  isAdvanced: boolean,
): number => {
  if (isAdvanced) return configuredDays;
  const widthBudget = Math.max(1, Math.floor(width / 58));
  const heightBudget = height < 120 ? 3 : configuredDays;
  return Math.min(configuredDays, widthBudget, heightBudget);
};
