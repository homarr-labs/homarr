export interface AirQualityPollutants {
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
  sulphurDioxide: number | null;
  carbonMonoxide: number | null;
}

export interface AirQualityPoint {
  observedAt: string;
  europeanAqi: number | null;
  usAqi: number | null;
  uvIndex: number | null;
  pollutants: AirQualityPollutants;
  europeanSubIndices: AirQualityPollutants;
  usSubIndices: AirQualityPollutants;
  pollen: Record<"alder" | "birch" | "grass" | "mugwort" | "olive" | "ragweed", number | null>;
}

export interface AirQualityData {
  timezone: string;
  utcOffsetSeconds: number;
  current: AirQualityPoint;
  hourly: AirQualityPoint[];
  daily: {
    date: string;
    europeanAqiMax: number | null;
    usAqiMax: number | null;
    uvIndexMax: number | null;
    pm2_5Max: number | null;
    pm10Max: number | null;
  }[];
}

export type AqiStandard = "european" | "us";
export type AqiStandardOption = "auto" | AqiStandard;
export type AqiCategory =
  | "good"
  | "fair"
  | "moderate"
  | "unhealthySensitive"
  | "unhealthy"
  | "poor"
  | "veryPoor"
  | "veryUnhealthy"
  | "extremelyPoor"
  | "hazardous"
  | "unknown";
export type UvCategory = "low" | "moderate" | "high" | "veryHigh" | "extreme" | "unknown";
export type PollutantKey = keyof AirQualityPoint["pollutants"];
export type PollenKey = keyof AirQualityPoint["pollen"];

export const getAqiStandard = (option: AqiStandardOption, locale: string): AqiStandard => {
  if (option !== "auto") return option;
  try {
    return new Intl.Locale(locale).region === "US" ? "us" : "european";
  } catch {
    return "european";
  }
};

export const getAqiValue = (point: AirQualityPoint, standard: AqiStandard): number | null => {
  if (standard === "us") return point.usAqi;
  return point.europeanAqi;
};

export const getDailyAqiValue = (day: AirQualityData["daily"][number], standard: AqiStandard): number | null => {
  if (standard === "us") return day.usAqiMax;
  return day.europeanAqiMax;
};

export const getAqiCategory = (value: number | null, standard: AqiStandard): AqiCategory => {
  if (value === null) return "unknown";

  if (standard === "us") {
    if (value <= 50) return "good";
    if (value <= 100) return "moderate";
    if (value <= 150) return "unhealthySensitive";
    if (value <= 200) return "unhealthy";
    if (value <= 300) return "veryUnhealthy";
    return "hazardous";
  }

  if (value <= 20) return "good";
  if (value <= 40) return "fair";
  if (value <= 60) return "moderate";
  if (value <= 80) return "poor";
  if (value <= 100) return "veryPoor";
  return "extremelyPoor";
};

export const getAqiColor = (category: AqiCategory): string => {
  if (category === "good") return "green.6";
  if (category === "fair") return "lime.7";
  if (category === "moderate") return "yellow.7";
  if (category === "unhealthySensitive" || category === "poor") return "orange.7";
  if (category === "unhealthy" || category === "veryPoor") return "red.7";
  if (category === "veryUnhealthy" || category === "extremelyPoor") return "grape.7";
  if (category === "hazardous") return "dark.6";
  return "gray.6";
};

export const getUvCategory = (value: number | null): UvCategory => {
  if (value === null) return "unknown";
  if (value < 3) return "low";
  if (value < 6) return "moderate";
  if (value < 8) return "high";
  if (value < 11) return "veryHigh";
  return "extreme";
};

export const getDominantPollutant = (
  point: AirQualityPoint,
  standard: AqiStandard,
): { key: PollutantKey; value: number } | null => {
  const values = standard === "us" ? point.usSubIndices : point.europeanSubIndices;
  return getHighestValue(values);
};

export const getStrongestPollen = (point: AirQualityPoint): { key: PollenKey; value: number } | null =>
  getHighestValue(point.pollen);

const getHighestValue = <TKey extends string>(
  values: Record<TKey, number | null>,
): { key: TKey; value: number } | null => {
  let highest: { key: TKey; value: number } | null = null;
  for (const [key, value] of Object.entries(values) as [TKey, number | null][]) {
    if (value === null) continue;
    if (highest === null || value > highest.value) highest = { key, value };
  }
  return highest;
};

export const getCompactAirQualityLayout = (width: number, height: number) => ({
  tiny: width < 150 || height < 96,
  showParticulatesAndPollen: width >= 240 && height >= 140,
  showSparkline: width >= 300 && height >= 170,
});

export const getUpcomingHours = (data: AirQualityData, count: number): AirQualityData["hourly"] => {
  const currentTime = Date.parse(data.current.observedAt);
  return data.hourly.filter((hour) => Date.parse(hour.observedAt) >= currentTime).slice(0, count);
};
