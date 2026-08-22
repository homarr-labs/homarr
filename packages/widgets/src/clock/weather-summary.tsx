import { Box, Group, Loader, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import { AnimatedWeatherIcon } from "../weather/animated-icon";
import { WeatherDescription } from "../weather/icon";

interface ClockWeatherSummaryProps {
  latitude: number;
  longitude: number;
  locationName: string;
  isFahrenheit: boolean;
  animateIcon: boolean;
  detailed: boolean;
}

export const ClockWeatherSummary = ({
  latitude,
  longitude,
  locationName,
  isFahrenheit,
  animateIcon,
  detailed,
}: ClockWeatherSummaryProps) => {
  const t = useI18n();
  const tCommon = useI18n("common");
  const weatherQuery = clientApi.widget.weather.atLocation.useQuery({ latitude, longitude });
  const weather = weatherQuery.data;

  if (!weather) {
    return isInitialWidgetQueryPending(weatherQuery) ? (
      <Loader size="xs" aria-label={tCommon("action.loading")} />
    ) : (
      <WidgetQueryErrorIndicator error={weatherQuery.error} label={t("widget.weather.name")} />
    );
  }

  const temperature = isFahrenheit ? weather.current.temperature * (9 / 5) + 32 : weather.current.temperature;
  const unit = isFahrenheit ? "°F" : "°C";
  const today = weather.daily[0];
  const formatTemperature = (value: number | null | undefined) => {
    if (value === undefined || value === null) return "—";
    const preferred = isFahrenheit ? value * (9 / 5) + 32 : value;
    return `${Math.round(preferred)}${unit}`;
  };

  return (
    <Stack gap={detailed ? 3 : 0} align="flex-start">
      <Group gap={5} wrap="nowrap">
        <AnimatedWeatherIcon
          animated={animateIcon}
          code={weather.current.weatherCode}
          isDay={weather.current.isDay}
          size={detailed ? 28 : 22}
        />
        <Text size={detailed ? "sm" : "xs"} fw={detailed ? 600 : undefined} c={detailed ? undefined : "dimmed"}>
          {Math.round(temperature)}
          {unit}
        </Text>
        {detailed && <WeatherDescription weatherOnly weatherCode={weather.current.weatherCode} />}
      </Group>
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
      <WidgetQueryErrorIndicator error={weatherQuery.error} label={t("widget.weather.name")} />
    </Stack>
  );
};
