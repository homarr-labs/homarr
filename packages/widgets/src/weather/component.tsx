import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import {
  Card,
  Flex,
  Group,
  IconArrowDownRight,
  IconArrowUpRight,
  IconMapPin,
  Stack,
  Text,
  Title,
} from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { WeatherIcon } from "./icon";

export default function WeatherWidget({
  options,
  width,
}: WidgetComponentProps<"weather">) {
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
    <Stack w="100%" h="100%" justify="space-around" gap={0} align="center">
      <WeeklyForecast
        weather={weather}
        width={width}
        options={options}
        shouldHide={!options.hasForecast}
      />
      <DailyWeather
        weather={weather}
        width={width}
        options={options}
        shouldHide={options.hasForecast}
      />
    </Stack>
  );
}

interface DailyWeatherProps
  extends Pick<WidgetComponentProps<"weather">, "width" | "options"> {
  shouldHide: boolean;
  weather: RouterOutputs["widget"]["weather"]["atLocation"];
}

const DailyWeather = ({
  shouldHide,
  width,
  options,
  weather,
}: DailyWeatherProps) => {
  if (shouldHide) {
    return null;
  }

  return (
    <>
      <Flex
        align="center"
        gap={width < 120 ? "0.25rem" : "xs"}
        justify={"center"}
        direction={width < 200 ? "column" : "row"}
      >
        <WeatherIcon
          size={width < 300 ? 30 : 50}
          code={weather.current_weather.weathercode}
        />
        <Title order={2}>
          {getPreferredUnit(
            weather.current_weather.temperature,
            options.isFormatFahrenheit,
          )}
        </Title>
      </Flex>

      {width > 200 && (
        <Group wrap="nowrap" gap="xs">
          <IconArrowUpRight />
          {getPreferredUnit(
            weather.daily.temperature_2m_max[0]!,
            options.isFormatFahrenheit,
          )}
          <IconArrowDownRight />
          {getPreferredUnit(
            weather.daily.temperature_2m_min[0]!,
            options.isFormatFahrenheit,
          )}
        </Group>
      )}

      {options.showCity && (
        <Group wrap="nowrap" gap={4} align="center">
          <IconMapPin height={15} width={15} />
          <Text style={{ whiteSpace: "nowrap" }}>{options.location.name}</Text>
        </Group>
      )}
    </>
  );
};

interface WeeklyForecastProps
  extends Pick<WidgetComponentProps<"weather">, "width" | "options"> {
  shouldHide: boolean;
  weather: RouterOutputs["widget"]["weather"]["atLocation"];
}

const WeeklyForecast = ({
  shouldHide,
  width,
  options,
  weather,
}: WeeklyForecastProps) => {
  if (shouldHide) {
    return null;
  }

  return (
    <>
      <Flex
        align="center"
        gap={width < 120 ? "0.25rem" : "xs"}
        justify="center"
        direction="row"
      >
        {options.showCity && (
          <Group wrap="nowrap" gap="xs" align="center">
            <IconMapPin color="blue" size={30} />
            <Text size="xl" style={{ whiteSpace: "nowrap" }}>
              {options.location.name}
            </Text>
          </Group>
        )}
        <WeatherIcon
          size={width < 300 ? 30 : 50}
          code={weather.current_weather.weathercode}
        />
        <Title
          order={2}
          c={weather.current_weather.temperature > 20 ? "red" : "blue"}
        >
          {getPreferredUnit(
            weather.current_weather.temperature,
            options.isFormatFahrenheit,
          )}
        </Title>
      </Flex>
      <Forecast weather={weather} options={options} width={width} />
    </>
  );
};

interface ForecastProps
  extends Pick<WidgetComponentProps<"weather">, "options" | "width"> {
  weather: RouterOutputs["widget"]["weather"]["atLocation"];
}

function Forecast({ weather, options, width }: ForecastProps) {
  return (
    <Flex align="center" direction="row" justify="space-between" w="100%">
      {weather.daily.time
        .slice(
          0,
          Math.min(options.forecastDayCount, width / (width < 300 ? 64 : 92)),
        )
        .map((time, index) => (
          <Card key={time}>
            <Flex direction="column" align="center">
              <Text fw={700} lh="1.25rem">
                {new Date(time).getDate().toString().padStart(2, "0")}
              </Text>
              <WeatherIcon
                size={width < 300 ? 20 : 50}
                code={weather.daily.weathercode[index]!}
              />
              <Text fz={width < 300 ? "xs" : "sm"} lh="1rem">
                {getPreferredUnit(
                  weather.daily.temperature_2m_max[index]!,
                  options.isFormatFahrenheit,
                )}
              </Text>
              <Text fz={width < 300 ? "xs" : "sm"} lh="1rem" c="grey">
                {getPreferredUnit(
                  weather.daily.temperature_2m_min[index]!,
                  options.isFormatFahrenheit,
                )}
              </Text>
            </Flex>
          </Card>
        ))}
    </Flex>
  );
}

const getPreferredUnit = (value: number, isFahrenheit = false): string =>
  isFahrenheit
    ? `${(value * (9 / 5) + 32).toFixed(1)}°F`
    : `${value.toFixed(1)}°C`;
