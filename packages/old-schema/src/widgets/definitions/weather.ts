import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrWeatherDefinition
  extends CommonOldmarrWidgetDefinition<
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
  > {}
