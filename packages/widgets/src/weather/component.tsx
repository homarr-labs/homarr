"use client";

import { Box, Group, HoverCard, Space, Stack, Text } from "@mantine/core";
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

  return (
    <Stack
      align="center"
      justify="center"
      gap="0"
      w="100%"
      h="100%"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      {options.hasForecast ? (
        <WeeklyForecast weather={weather} options={options} />
      ) : (
        <DailyWeather weather={weather} options={options} />
      )}
    </Stack>
  );
}

interface WeatherProps extends Pick<WidgetComponentProps<"weather">, "options"> {
  weather: RouterOutputs["widget"]["weather"]["atLocation"];
}

const DailyWeather = ({ options, weather }: WeatherProps) => {
  const t = useScopedI18n("widget.weather");
  return (
    <>
      <Group className="weather-day-group" gap="1cqmin">
        <HoverCard>
          <HoverCard.Target>
            <Box>
              <WeatherIcon size="20cqmin" code={weather.current.weathercode} />
            </Box>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <WeatherDescription weatherOnly weatherCode={weather.current.weathercode} />
          </HoverCard.Dropdown>
        </HoverCard>
        <Text fz="17.5cqmin">
          {getPreferredUnit(weather.current.temperature, options.isFormatFahrenhei, options.disableTemperatureDecimals)}
        </Text>
      </Group>
      <Space h="1cqmin" />
      {options.showCurrentWindSpeed && (
        <Group className="weather-current-wind-speed-group" wrap="nowrap" gap="1cqmin">
          <IconWind size="12.5cqmin" />
          <Text fz="10cqmin">{t("currentWindSpeed", { currentWindSpeed: weather.current.windspeed })}</Text>
        </Group>
      )}
      <Space h="1cqmin" />
      <Group className="weather-max-min-temp-group" wrap="nowrap" gap="1cqmin">
        <IconArrowUpRight size="12.5cqmin" />
        <Text fz="10cqmin">
          {getPreferredUnit(weather.daily[0]?.maxTemp, options.isFormatFahrenheit, options.disableTemperatureDecimals)}
        </Text>
        <Space w="2.5cqmin" />
        <IconArrowDownRight size="12.5cqmin" />
        <Text fz="10cqmin">
          {getPreferredUnit(weather.daily[0]?.minTemp, options.isFormatFahrenheit, options.disableTemperatureDecimals)}
        </Text>
      </Group>
      {options.showCity && (
        <>
          <Space h="5cqmin" />
          <Group className="weather-city-group" wrap="nowrap" gap="1cqmin">
            <IconMapPin size="12.5cqmin" />
            <Text size="12.5cqmin" style={{ whiteSpace: "nowrap" }}>
              {options.location.name}
            </Text>
          </Group>
        </>
      )}
    </>
  );
};

const WeeklyForecast = ({ options, weather }: WeatherProps) => {
  return (
    <>
      <Group className="weather-forecast-city-temp-group" wrap="nowrap" gap="5cqmin">
        {options.showCity && (
          <>
            <IconMapPin size="20cqmin" />
            <Text size="15cqmin" style={{ whiteSpace: "nowrap" }}>
              {options.location.name}
            </Text>
            <Space w="20cqmin" />
          </>
        )}
        <HoverCard>
          <HoverCard.Target>
            <Box>
              <WeatherIcon size="20cqmin" code={weather.current.weathercode} />
            </Box>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <WeatherDescription weatherOnly weatherCode={weather.current.weathercode} />
          </HoverCard.Dropdown>
        </HoverCard>
        <Text fz="20cqmin">
          {getPreferredUnit(
            weather.current.temperature,
            options.isFormatFahrenheit,
            options.disableTemperatureDecimals,
          )}
        </Text>
      </Group>
      <Space h="2.5cqmin" />
      <Forecast weather={weather} options={options} />
    </>
  );
};

function Forecast({ weather, options }: WeatherProps) {
  const dateFormat = options.dateFormat;
  return (
    <Group className="weather-forecast-days-group" w="100%" justify="space-evenly" wrap="nowrap" pb="2.5cqmin">
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
              <Text fz="10cqmin">{dayjs(dayWeather.time).format("dd")}</Text>
              <WeatherIcon size="15cqmin" code={dayWeather.weatherCode} />
              <Text fz="10cqmin">
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
