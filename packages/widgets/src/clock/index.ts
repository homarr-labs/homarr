import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";
import {
  defaultWorldClockCities,
  getTimeZoneOptions,
  maximumWorldClockCities,
  worldClockCityPresets,
} from "./world-clock";

const timeZoneOptions = getTimeZoneOptions();

export const { definition, componentLoader } = createWidgetDefinition("clock", {
  icon: IconClock,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "weather", "atLocation"]],
  queryMatcher: ({ input }, scope) => {
    const location = scope.options.weatherLocation;
    if (
      scope.options.showWeather !== true ||
      location === null ||
      typeof location !== "object" ||
      !("latitude" in location) ||
      !("longitude" in location)
    ) {
      return false;
    }
    return widgetQueryInputMatches(input, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
  },
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        customTitleToggle: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        customTitle: factory.text({
          defaultValue: "",
        }),
        is24HourFormat: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
        useCustomTimezone: factory.switch({ defaultValue: false }),
        timezone: factory.select({
          options: timeZoneOptions,
          defaultValue: "Europe/London",
          searchable: true,
          withDescription: true,
        }),
        showDate: factory.switch({
          defaultValue: true,
        }),
        dateFormat: factory.select({
          options: [
            { value: "YYYY-MM-DD", label: `${dayjs().format("YYYY-MM-DD")} · YYYY-MM-DD` },
            { value: "DD/MM/YYYY", label: `${dayjs().format("DD/MM/YYYY")} · DD/MM/YYYY` },
            { value: "MM/DD/YYYY", label: `${dayjs().format("MM/DD/YYYY")} · MM/DD/YYYY` },
            { value: "dddd, MMMM D", label: `${dayjs().format("dddd, MMMM D")} · dddd, MMMM D` },
            { value: "dddd, D MMMM", label: `${dayjs().format("dddd, D MMMM")} · dddd, D MMMM` },
            { value: "MMM D, YYYY", label: `${dayjs().format("MMM D, YYYY")} · MMM D, YYYY` },
            { value: "D MMM YYYY", label: `${dayjs().format("D MMM YYYY")} · D MMM YYYY` },
            { value: "MMM D", label: `${dayjs().format("MMM D")} · MMM D` },
            { value: "D MMM", label: `${dayjs().format("D MMM")} · D MMM` },
            { value: "DD/MM", label: `${dayjs().format("DD/MM")} · DD/MM` },
            { value: "MM/DD", label: `${dayjs().format("MM/DD")} · MM/DD` },
          ],
          defaultValue: "dddd, MMMM D",
          withDescription: true,
        }),
        customTimeFormat: factory.select({
          options: [
            { value: "HH:mm", label: `${dayjs().format("HH:mm")} · HH:mm` },
            { value: "HH:mm:ss", label: `${dayjs().format("HH:mm:ss")} · HH:mm:ss` },
            { value: "h:mm A", label: `${dayjs().format("h:mm A")} · h:mm A` },
            { value: "h:mm:ss A", label: `${dayjs().format("h:mm:ss A")} · h:mm:ss A` },
          ],
          defaultValue: "HH:mm",
          withDescription: true,
        }),
        showWeather: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        weatherLocation: factory.location({
          defaultValue: {
            name: "Brisbane",
            latitude: -27.4698,
            longitude: 153.0251,
          },
        }),
        isWeatherFormatFahrenheit: factory.switch({
          defaultValue: false,
        }),
        animateWeatherIcon: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        worldClockCities: factory.timezoneList({
          defaultValue: defaultWorldClockCities.map((city) => ({ ...city })),
          maxValues: maximumWorldClockCities,
          presets: worldClockCityPresets,
          timeZoneOptions,
          withDescription: true,
        }),
      }),
      {
        is24HourFormat: {
          shouldHide: () => true,
        },
        customTitle: {
          shouldHide: (options) => !options.customTitleToggle,
        },
        timezone: {
          shouldHide: (options) => !options.useCustomTimezone,
        },
        dateFormat: {
          shouldHide: (options) => !options.showDate,
        },
        weatherLocation: {
          shouldHide: (options) => !options.showWeather,
        },
        isWeatherFormatFahrenheit: {
          shouldHide: (options) => !options.showWeather,
        },
        animateWeatherIcon: {
          shouldHide: (options) => !options.showWeather,
        },
      },
    );
  },
}).withDynamicImport(() => import("./component"));
