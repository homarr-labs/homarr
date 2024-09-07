import type { CommonOldmarrWidgetDefinition } from "./common";

export type OldmarrWeatherDefinition = CommonOldmarrWidgetDefinition<
  "weather",
  {
    displayInFahrenheit: boolean;
    displayCityName: boolean;
    displayWeekly: boolean;
    forecastDays: number;
    location: {
      name: string;
      latitude: number;
      longitude: number;
    };
  }
>;
