import "../widgets-common.css";

import { WeatherIcon } from "./icon";

interface AnimatedWeatherIconProps {
  code: number;
  size?: string | number;
}

const getAnimationClass = (code: number): string => {
  if (code === 0) return "weather-anim-sun";
  if ([1, 2, 3].includes(code)) return "weather-anim-cloud";
  if ([45, 48].includes(code)) return "weather-anim-fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "weather-anim-rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "weather-anim-snow";
  if ([95, 96, 99].includes(code)) return "weather-anim-storm";
  return "";
};

export const AnimatedWeatherIcon = ({ code, size = 26 }: AnimatedWeatherIconProps) => {
  return (
    <span className={`weather-anim-wrapper ${getAnimationClass(code)}`}>
      <WeatherIcon code={code} size={size} />
    </span>
  );
};
