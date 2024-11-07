import { Stack, Text } from "@mantine/core";
import {
  IconCloud,
  IconCloudFog,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconQuestionMark,
  IconSnowflake,
  IconSun,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import type { TranslationObject } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetProps } from "../definition";

interface WeatherIconProps {
  code: number;
  size?: string | number;
}

/**
 * Icon which should be displayed when specific code is defined
 * @param code weather code from api
 * @param size size of the icon, accepts relative sizes too
 * @returns Icon corresponding to the weather code
 */
export const WeatherIcon = ({ code, size = 50 }: WeatherIconProps) => {
  const { icon: Icon } = weatherDefinitions.find((definition) => definition.codes.includes(code)) ?? unknownWeather;

  return <Icon style={{ float: "left" }} size={size} />;
};

interface WeatherDescriptionProps {
  weatherOnly?: boolean;
  dateFormat?: WidgetProps<"weather">["options"]["dateFormat"];
  time?: string;
  weatherCode: number;
  maxTemp?: string;
  minTemp?: string;
}

/**
 * Description Dropdown for a given set of parameters
 * @param dateFormat format of the date that will be displayed on the widget
 * @param time date that can be formatted by dayjs
 * @param weatherCode weather code from api
 * @param maxTemp preformatted string for max temperature
 * @param minTemp preformatted string for min temperature
 * @returns Content for a HoverCard dropdown presenting weather information
 */
export const WeatherDescription = ({
  weatherOnly,
  dateFormat,
  time,
  weatherCode,
  maxTemp,
  minTemp,
}: WeatherDescriptionProps) => {
  const t = useScopedI18n("widget.weather");
  const tCommon = useScopedI18n("common");

  const { name } = weatherDefinitions.find((definition) => definition.codes.includes(weatherCode)) ?? unknownWeather;

  if (weatherOnly) {
    return <Text fz="16px">{t(`kind.${name}`)}</Text>;
  }

  return (
    <Stack align="center" gap="0">
      <Text fz="24px">{dayjs(time).format(dateFormat)}</Text>
      <Text fz="16px">{t(`kind.${name}`)}</Text>
      <Text fz="16px">{`${tCommon("information.max")}: ${maxTemp}`}</Text>
      <Text fz="16px">{`${tCommon("information.min")}: ${minTemp}`}</Text>
    </Stack>
  );
};

interface WeatherDefinitionType {
  icon: TablerIcon;
  name: keyof TranslationObject["widget"]["weather"]["kind"];
  codes: number[];
}

// 0 Clear sky
// 1, 2, 3 Mainly clear, partly cloudy, and overcast
// 45, 48 Fog and depositing rime fog
// 51, 53, 55 Drizzle: Light, moderate, and dense intensity
// 56, 57 Freezing Drizzle: Light and dense intensity
// 61, 63, 65 Rain: Slight, moderate and heavy intensity
// 66, 67 Freezing Rain: Light and heavy intensity
// 71, 73, 75 Snow fall: Slight, moderate, and heavy intensity
// 77 Snow grains
// 80, 81, 82 Rain showers: Slight, moderate, and violent
// 85, 86Snow showers slight and heavy
// 95 *Thunderstorm: Slight or moderate
// 96, 99 *Thunderstorm with slight and heavy hail
const weatherDefinitions: WeatherDefinitionType[] = [
  { icon: IconSun, name: "clear", codes: [0] },
  { icon: IconCloud, name: "mainlyClear", codes: [1, 2, 3] },
  { icon: IconCloudFog, name: "fog", codes: [45, 48] },
  { icon: IconCloud, name: "drizzle", codes: [51, 53, 55] },
  { icon: IconSnowflake, name: "freezingDrizzle", codes: [56, 57] },
  { icon: IconCloudRain, name: "rain", codes: [61, 63, 65] },
  { icon: IconCloudRain, name: "freezingRain", codes: [66, 67] },
  { icon: IconCloudSnow, name: "snowFall", codes: [71, 73, 75] },
  { icon: IconCloudSnow, name: "snowGrains", codes: [77] },
  { icon: IconCloudRain, name: "rainShowers", codes: [80, 81, 82] },
  { icon: IconCloudSnow, name: "snowShowers", codes: [85, 86] },
  { icon: IconCloudStorm, name: "thunderstorm", codes: [95] },
  { icon: IconCloudStorm, name: "thunderstormWithHail", codes: [96, 99] },
];

const unknownWeather: Omit<WeatherDefinitionType, "codes"> = {
  icon: IconQuestionMark,
  name: "unknown",
};
