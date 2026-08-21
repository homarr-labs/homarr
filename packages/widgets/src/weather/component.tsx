"use client";

import { Box } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryErrorIndicator, WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { AdvancedWeather } from "./advanced";
import classes from "./component.module.css";
import { CompactWeather } from "./compact";

export default function WeatherWidget({
  isEditMode,
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"weather">) {
  const t = useI18n("widget.weather");
  const input = {
    latitude: options.location.latitude,
    longitude: options.location.longitude,
  };
  const weatherQuery = clientApi.widget.weather.atLocation.useQuery(input);
  const weather = getUsableWidgetQueryData(weatherQuery);

  if (isInitialWidgetQueryPending(weatherQuery)) return <WidgetQueryLoadingState />;
  if (!weather) return <WidgetEmptyState />;

  return (
    <Box className={classes.weatherSurface} h="100%" w="100%" pos="relative">
      <Box className={classes.weatherContent} h="100%" w="100%" pos="relative">
        {displayMode === "advanced" ? (
          <AdvancedWeather height={height} options={options} weather={weather} width={width} />
        ) : (
          <CompactWeather height={height} isEditMode={isEditMode} options={options} weather={weather} width={width} />
        )}
      </Box>
      {weatherQuery.error && (
        <Box pos="absolute" top={4} right={4} className={classes.errorIndicator}>
          <WidgetQueryErrorIndicator error={weatherQuery.error} label={t("name")} />
        </Box>
      )}
    </Box>
  );
}
