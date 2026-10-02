export type CompactWeatherTier = "micro" | "compact" | "standard" | "roomy";

export interface CompactWeatherLayout {
  tier: CompactWeatherTier;
  forecastDays: number;
  showCity: boolean;
  showCondition: boolean;
  showHighLow: boolean;
  showSecondary: boolean;
}

const compactWeatherBreakpoints = [
  { tier: "roomy", minWidth: 500, minHeight: 280 },
  { tier: "standard", minWidth: 280, minHeight: 180 },
  { tier: "compact", minWidth: 160, minHeight: 120 },
  { tier: "micro", minWidth: 0, minHeight: 0 },
] as const satisfies readonly { tier: CompactWeatherTier; minWidth: number; minHeight: number }[];

export const getCompactWeatherLayout = (
  width: number,
  height: number,
  hasForecast: boolean,
  configuredDays: number,
): CompactWeatherLayout => {
  const breakpoint = compactWeatherBreakpoints.find(
    ({ minHeight, minWidth }) => width >= minWidth && height >= minHeight,
  );
  const tier = breakpoint?.tier ?? "micro";

  if (tier === "micro") {
    return {
      tier: "micro",
      forecastDays: 0,
      showCity: false,
      showCondition: false,
      showHighLow: false,
      showSecondary: false,
    };
  }

  if (tier === "compact") {
    return {
      tier: "compact",
      forecastDays: hasForecast ? Math.min(configuredDays, Math.max(1, Math.floor(width / 92))) : 0,
      showCity: width >= 220,
      showCondition: true,
      showHighLow: true,
      showSecondary: false,
    };
  }

  const availableForecastWidth = Math.max(0, width - 24);
  return {
    tier,
    forecastDays: hasForecast ? Math.min(configuredDays, Math.max(1, Math.floor(availableForecastWidth / 64))) : 0,
    showCity: true,
    showCondition: true,
    showHighLow: true,
    showSecondary: true,
  };
};

export const getAdvancedWeatherLayout = (width: number, height: number) => ({
  chartHeight: height >= 520 ? 200 : 150,
  dailyColumns: width >= 700 ? 4 : width >= 480 ? 3 : width >= 320 ? 2 : 1,
  hourlyTickStep: width >= 520 ? 3 : 6,
  metricColumns: width >= 700 ? 3 : width >= 420 ? 2 : 1,
  showChartAxes: width >= 520,
});
