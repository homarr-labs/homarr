"use client";

import { Box, Group, HoverCard, Space, Stack, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconArrowDownRight, IconArrowUpRight, IconMapPin, IconWind } from "@tabler/icons-react";
import combineClasses from "clsx";
import dayjs from "dayjs";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { WeatherDescription, WeatherIcon } from "./icon";

export default function WeatherWidget({ isEditMode, options }: WidgetComponentProps<"weather">) {
  const [weather] = clientApi.widget.weather.atLocation.useSuspenseQuery(
    {
      latitude: options.location.latitude,
      longitude: options.location.longitude,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const { ref, width } = useElementSize();

  const fontSize = width < 350 ? 16 : 30;

  const sizing = { fontSize };

  return (
    <Stack
      align="center"
      justify="center"
      gap={width < 350 ? 0 : "sm"}
      w="100%"
      h="100%"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
      ref={ref}
    >
      {options.hasForecast ? (
        <WeeklyForecast weather={weather} options={options} sizing={sizing} />
      ) : (
        <DailyWeather weather={weather} options={options} sizing={sizing} />
      )}
    </Stack>
  );
}

interface WeatherProps extends Pick<WidgetComponentProps<"weather">, "options"> {
  weather: RouterOutputs["widget"]["weather"]["atLocation"];
  sizing: {
    fontSize: number;
  };
}

const DailyWeather = ({ options, weather, sizing }: WeatherProps) => {
  const t = useScopedI18n("widget.weather");

  return (
    <>
      <Group className="weather-day-group" gap="sm">
        <HoverCard>
          <HoverCard.Target>
            <Box>
              <WeatherIcon size={30} code={weather.current.weathercode} />
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
      <Space h="sm" />
      {options.showCurrentWindSpeed && (
        <Group className="weather-current-wind-speed-group" wrap="nowrap" gap="sm">
          <IconWind size={sizing.fontSize} />
          <Text fz={sizing.fontSize}>{t("currentWindSpeed", { currentWindSpeed: weather.current.windspeed })}</Text>
        </Group>
      )}
      <Group className="weather-max-min-temp-group" wrap="nowrap" gap="sm">
        <IconArrowUpRight size={sizing.fontSize} />
        <Text fz={sizing.fontSize}>
          {getPreferredUnit(weather.daily[0]?.maxTemp, options.isFormatFahrenheit, options.disableTemperatureDecimals)}
        </Text>
        <Space w="sm" />
        <IconArrowDownRight size={sizing.fontSize} />
        <Text fz={sizing.fontSize}>
          {getPreferredUnit(weather.daily[0]?.minTemp, options.isFormatFahrenheit, options.disableTemperatureDecimals)}
        </Text>
      </Group>
      {options.showCity && (
        <>
          <Space h="sm" />
          <Group className="weather-city-group" wrap="nowrap" gap="xs">
            <IconMapPin size={sizing.fontSize} />
            <Text fz={sizing.fontSize} style={{ whiteSpace: "nowrap" }}>
              {options.location.name}
            </Text>
          </Group>
        </>
      )}
    </>
  );
};

const WeeklyForecast = ({ options, weather, sizing }: WeatherProps) => {
  return (
    <>
      <Group className="weather-forecast-city-temp-group" wrap="nowrap" gap="md">
        {options.showCity && (
          <>
            <IconMapPin size={30} />
            <Text fz={30} style={{ whiteSpace: "nowrap" }}>
              {options.location.name}
            </Text>
            <Space w="xl" />
          </>
        )}
        <HoverCard>
          <HoverCard.Target>
            <Box>
              <WeatherIcon size={30} code={weather.current.weathercode} />
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
      <Space h="sm" />
      <Forecast weather={weather} options={options} sizing={sizing} />
    </>
  );
};

function Forecast({ weather, options, sizing }: WeatherProps) {
  const dateFormat = options.dateFormat;
  return (
    <Group className="weather-forecast-days-group" w="100%" justify="space-evenly" wrap="nowrap" pb="sm">
      {weather.daily.slice(0, options.forecastDayCount).map((dayWeather, index) => (
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
              <WeatherIcon size={sizing.fontSize} code={dayWeather.weatherCode} />
              <Text fz={sizing.fontSize}>
                {getPreferredUnit(dayWeather.maxTemp, options.isFormatFahrenheit, options.disableTemperatureDecimals)}
              </Text>
            </Stack>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <WeatherDescription
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
            />
          </HoverCard.Dropdown>
        </HoverCard>
      ))}
    </Group>
  );
}

const getPreferredUnit = (value?: number, isFahrenheit = false, disableTemperatureDecimals = false): string =>
  value
    ? isFahrenheit
      ? `${(value * (9 / 5) + 32).toFixed(disableTemperatureDecimals ? 0 : 1)}°F`
      : `${value.toFixed(disableTemperatureDecimals ? 0 : 1)}°C`
    : "?";
