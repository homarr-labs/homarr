import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { logger } from "@homarr/log";

import type { WidgetComponentProps } from "../../../widgets/src/definition";
import type { OldmarrWidgetDefinitions, WidgetMapping } from "./definitions";

// This type enforces, that for all widget mappings there is a corresponding option mapping,
// each option of newmarr can be mapped from the value of the oldmarr options
type OptionMapping = {
  [WidgetKey in keyof WidgetMapping]: WidgetMapping[WidgetKey] extends null
    ? null
    : {
        [OptionsKey in keyof WidgetComponentProps<WidgetKey>["options"]]: (
          oldOptions: Extract<OldmarrWidgetDefinitions, { id: WidgetMapping[WidgetKey] }>["options"],
        ) => WidgetComponentProps<WidgetKey>["options"][OptionsKey] | undefined;
      };
};

const optionMapping: OptionMapping = {
  "mediaRequests-requestList": {
    linksTargetNewTab: (oldOptions) => oldOptions.openInNewTab,
  },
  "mediaRequests-requestStats": {},
  calendar: {
    filterFutureMonths: () => undefined,
    filterPastMonths: () => undefined,
  },
  clock: {
    customTitle: (oldOptions) => oldOptions.customTitle,
    customTitleToggle: (oldOptions) => oldOptions.titleState !== "none",
    dateFormat: (oldOptions) => (oldOptions.dateFormat === "hide" ? undefined : oldOptions.dateFormat),
    is24HourFormat: (oldOptions) => oldOptions.display24HourFormat,
    showDate: (oldOptions) => oldOptions.dateFormat !== "hide",
    showSeconds: () => undefined,
    timezone: (oldOptions) => oldOptions.timezone,
    useCustomTimezone: () => true,
  },
  weather: {
    forecastDayCount: (oldOptions) => oldOptions.forecastDays,
    hasForecast: (oldOptions) => oldOptions.displayWeekly,
    isFormatFahrenheit: (oldOptions) => oldOptions.displayInFahrenheit,
    location: (oldOptions) => oldOptions.location,
    showCity: (oldOptions) => oldOptions.displayCityName,
  },
  iframe: {
    embedUrl: (oldOptions) => oldOptions.embedUrl,
    allowAutoPlay: (oldOptions) => oldOptions.allowAutoPlay,
    allowFullScreen: (oldOptions) => oldOptions.allowFullScreen,
    allowPayment: (oldOptions) => oldOptions.allowPayment,
    allowCamera: (oldOptions) => oldOptions.allowCamera,
    allowMicrophone: (oldOptions) => oldOptions.allowMicrophone,
    allowGeolocation: (oldOptions) => oldOptions.allowGeolocation,
    allowScrolling: (oldOptions) => oldOptions.allowScrolling,
    allowTransparency: (oldOptions) => oldOptions.allowTransparency,
  },
  video: {
    feedUrl: (oldOptions) => oldOptions.FeedUrl,
    hasAutoPlay: (oldOptions) => oldOptions.autoPlay,
    hasControls: (oldOptions) => oldOptions.controls,
    isMuted: (oldOptions) => oldOptions.muted,
  },
  dnsHoleControls: {
    showToggleAllButtons: (oldOptions) => oldOptions.showToggleAllButtons,
  },
  dnsHoleSummary: {
    layout: (oldOptions) => oldOptions.layout,
    usePiHoleColors: (oldOptions) => oldOptions.usePiHoleColors,
  },
  rssFeed: {
    feedUrls: (oldOptions) => oldOptions.rssFeedUrl,
    maximumAmountPosts: (oldOptions) => oldOptions.maximumAmountOfPosts,
    textLinesClamp: (oldOptions) => oldOptions.textLinesClamp,
  },
  notebook: {
    allowReadOnlyCheck: (oldOptions) => oldOptions.allowReadOnlyCheck,
    content: (oldOptions) => oldOptions.content,
    showToolbar: (oldOptions) => oldOptions.showToolbar,
  },
  "smartHome-entityState": {
    entityId: (oldOptions) => oldOptions.entityId,
    displayName: (oldOptions) => oldOptions.displayName,
    clickable: () => undefined,
    entityUnit: () => undefined,
  },
  "smartHome-executeAutomation": {
    automationId: (oldOptions) => oldOptions.automationId,
    displayName: (oldOptions) => oldOptions.displayName,
  },
  mediaServer: {},
  app: null,
};

/**
 * Maps the oldmarr options to the newmarr options
 * @param kind item kind to map
 * @param oldOptions oldmarr options for this item
 * @returns newmarr options for this item or null if the item did not exist in oldmarr
 */
export const mapOptions = <K extends WidgetKind>(
  kind: K,
  oldOptions: Extract<OldmarrWidgetDefinitions, { id: WidgetMapping[K] }>["options"],
) => {
  logger.info(`Mapping options for widget ${kind}, ${JSON.stringify(oldOptions)}`);
  if (optionMapping[kind] === null) {
    return null;
  }

  const mapping = optionMapping[kind];
  return objectEntries(mapping).reduce(
    (acc, [key, value]) => {
      const newValue = value(oldOptions as never);
      logger.info(`Mapping option ${key as string} for widget ${kind}, new=${newValue as string}`);
      if (newValue !== undefined) {
        acc[key as string] = newValue;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  ) as WidgetComponentProps<K>["options"];
};
