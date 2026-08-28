import { Box, Group, Loader, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { isInitialWidgetQueryPending } from "../common/query-state";
import { AnimatedWeatherIcon } from "../weather/animated-icon";
import { WeatherDescription } from "../weather/icon";

interface ClockWeatherSummaryProps {
  latitude: number;
  longitude: number;
  locationName: string;
  isFahrenheit: boolean;
  animateIcon: boolean;
  colorByDayNight: boolean;
  dayColor: string;
  nightColor: string;
  detailed: boolean;
}

export const ClockWeatherSummary = ({
  latitude,
  longitude,
  locationName,
  isFahrenheit,
  animateIcon,
  colorByDayNight,
  dayColor,
  nightColor,
  detailed,
}: ClockWeatherSummaryProps) => {
  const tCommon = useI18n("common");
  const weatherQuery = clientApi.widget.weather.atLocation.useQuery({ latitude, longitude });
  const weather = weatherQuery.data;

  if (!weather) {
    if (isInitialWidgetQueryPending(weatherQuery)) {
      return <Loader size="xs" aria-label={tCommon("action.loading")} />;
    }

    return null;
  }

  const temperature = isFahrenheit ? weather.current.temperature * (9 / 5) + 32 : weather.current.temperature;
  const unit = isFahrenheit ? "°F" : "°C";
  const today = weather.daily[0];
  const formatTemperature = (value: number | null | undefined) => {
    if (value === undefined || value === null) return "—";
    const preferred = isFahrenheit ? value * (9 / 5) + 32 : value;
    return `${Math.round(preferred)}${unit}`;
  };

  const weatherColor = colorByDayNight
    ? `var(--mantine-color-${weather.current.isDay ? dayColor : nightColor}-5)`
    : undefined;

  return (
    <Stack gap={detailed ? 3 : 2} align={detailed ? "flex-start" : "center"}>
      {detailed ? (
        <Group gap={5} wrap="nowrap">
          <AnimatedWeatherIcon
            animated={animateIcon}
            code={weather.current.weatherCode}
            isDay={weather.current.isDay}
            style={{ ...zoomCompensatedSize(28), ...(weatherColor ? { color: weatherColor } : undefined) }}
          />
          <Text size="sm" fw={600} c={weatherColor}>
            {Math.round(temperature)}
            {unit}
          </Text>
          <WeatherDescription weatherOnly weatherCode={weather.current.weatherCode} />
        </Group>
      ) : (
        <Stack gap={1} align="center">
          <AnimatedWeatherIcon
            animated={animateIcon}
            code={weather.current.weatherCode}
            isDay={weather.current.isDay}
            style={{ ...zoomCompensatedSize(26), ...(weatherColor ? { color: weatherColor } : undefined) }}
          />
          <Text size="xs" c={weatherColor ?? "dimmed"}>
            {Math.round(temperature)}
            {unit}
          </Text>
        </Stack>
      )}
      {detailed && (
        <Box>
          <Text size="xs" fw={600} lineClamp={1}>
            {locationName}
          </Text>
          <Text size="xs" c="dimmed">
            {formatTemperature(today?.maxTemperature)} / {formatTemperature(today?.minTemperature)}
          </Text>
        </Box>
      )}
    </Stack>
  );
};
