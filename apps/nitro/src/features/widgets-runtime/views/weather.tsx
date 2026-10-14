import { Box, Center, Text, VisuallyHidden } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";
import type { WidgetComponentProps } from "@homarr/widgets/definition";
import { CompactWeather } from "@homarr/widgets/weather/compact";
import { AdvancedWeather } from "@homarr/widgets/weather/advanced";

import { nativeWidgetApi } from "../native-client";
import { getUsableNativeWidgetData } from "../query-state";

export default function NativeWeatherWidget({
  options,
  width,
  height,
  displayMode,
  isEditMode,
}: WidgetComponentProps<"weather">) {
  const t = useI18n("widget.weather");
  const tQuery = useI18n("common.widgetQuery");
  const query = nativeWidgetApi.weather.atLocation.useQuery({
    latitude: options.location.latitude,
    longitude: options.location.longitude,
  });
  const weather = getUsableNativeWidgetData(query);
  if (query.isPending && weather === undefined && !query.error) {
    return (
      <Center component="output" h="100%" w="100%" p="sm" aria-live="polite">
        <VisuallyHidden>{tQuery("loading")}</VisuallyHidden>
      </Center>
    );
  }
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
    <Box h="100%" w="100%" pos="relative" style={{ overflow: "hidden" }}>
      <Box h="100%" w="100%" pos="relative" miw={0} mih={0}>
        {displayMode === "advanced" ? (
          <AdvancedWeather height={height} options={options} weather={weather} width={width} />
        ) : (
          <CompactWeather height={height} isEditMode={isEditMode} options={options} weather={weather} width={width} />
        )}
      </Box>
    </Box>
  );
}
