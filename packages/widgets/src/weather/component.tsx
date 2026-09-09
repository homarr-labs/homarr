"use client";

import { Box, Center, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { getWidgetLayoutSize } from "../common/widget-layout-size";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { AdvancedWeather } from "./advanced";
import classes from "./component.module.css";
import { CompactWeather } from "./compact";

export default function WeatherWidget({
  isEditMode,
  options,
  width: logicalWidth,
  height: logicalHeight,
  displayMode,
  displayScale,
}: WidgetComponentProps<"weather">) {
  const { width, height } = getWidgetLayoutSize({
    width: logicalWidth,
    height: logicalHeight,
    displayScale,
    displayMode,
  });
  const t = useI18n("widget.weather");
  const input = {
    latitude: options.location.latitude,
    longitude: options.location.longitude,
  };
  const weatherQuery = clientApi.widget.weather.atLocation.useQuery(input);
  const weather = getUsableWidgetQueryData(weatherQuery);

  if (isInitialWidgetQueryPending(weatherQuery)) return <WidgetQueryLoadingState />;
  if (!weather) {
    return (
      <Center h="100%" w="100%" p="sm">
        <Text c="dimmed" size="sm" ta="center">
          {t("disabled")}
        </Text>
      </Center>
    );
  }

  return (
    <Box className={classes.weatherSurface} h="100%" w="100%" pos="relative">
      <Box className={classes.weatherContent} h="100%" w="100%" pos="relative">
        {displayMode === "advanced" ? (
          <AdvancedWeather height={height} options={options} weather={weather} width={width} />
        ) : (
          <CompactWeather height={height} isEditMode={isEditMode} options={options} weather={weather} width={width} />
        )}
      </Box>
    </Box>
  );
}
