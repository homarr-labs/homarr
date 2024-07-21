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
          appsMap: Map<string, string>,
        ) => WidgetComponentProps<WidgetKey>["options"][OptionsKey] | undefined;
      };
};

const optionMapping: OptionMapping = {
  "mediaRequests-requestList": {
    linksTargetNewTab: (oldOptions) => oldOptions.openInNewTab,
  },
  "mediaRequests-requestStats": {},
  bookmarks: {
    title: (oldOptions) => oldOptions.name,
    // It's safe to assume that the app exists, because the app is always created before the widget
    // And the mapping is created in insertAppsAsync
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    items: (oldOptions, appsMap) => oldOptions.items.map((item) => appsMap.get(item.id)!),
    layout: (oldOptions) => {
      const mappedLayouts: Record<typeof oldOptions.layout, WidgetComponentProps<"bookmarks">["options"]["layout"]> = {
        autoGrid: "grid",
        horizontal: "row",
        vertical: "column",
      };

      return mappedLayouts[oldOptions.layout];
    },
  },
  calendar: {
    releaseType: (oldOptions) => [oldOptions.radarrReleaseType],
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
  downloads: {
    activeTorrentThreshold: (oldOptions) => oldOptions.speedLimitOfActiveTorrents,
    applyFilterToRatio: (oldOptions) => oldOptions.displayRatioWithFilter,
    categoryFilter: (oldOptions) => oldOptions.labelFilter,
    filterIsWhitelist: (oldOptions) => oldOptions.labelFilterIsWhitelist,
    enableRowSorting: (oldOptions) => oldOptions.rowSorting,
    showCompletedTorrent: (oldOptions) => oldOptions.displayCompletedTorrents,
    columns: () => ["integration", "name", "progress", "time", "actions"],
    defaultSort: () => "type",
    descendingDefaultSort: () => false,
    showCompletedUsenet: () => true,
  },
  weather: {
    forecastDayCount: (oldOptions) => oldOptions.forecastDays,
    hasForecast: (oldOptions) => oldOptions.displayWeekly,
    isFormatFahrenheit: (oldOptions) => oldOptions.displayInFahrenheit,
    location: (oldOptions) => oldOptions.location,
    showCity: (oldOptions) => oldOptions.displayCityName,
    dateFormat: (oldOptions) => (oldOptions.dateFormat === "hide" ? undefined : oldOptions.dateFormat),
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
    enableRtl: (oldOptions) => oldOptions.enableRtl,
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
  indexerManager: {
    openIndexerSiteInNewTab: (oldOptions) => oldOptions.openIndexerSiteInNewTab,
  },
  healthMonitoring: {
    cpu: (oldOptions) => oldOptions.cpu,
    memory: (oldOptions) => oldOptions.memory,
    fahrenheit: (oldOptions) => oldOptions.fahrenheit,
    fileSystem: (oldOptions) => oldOptions.fileSystem,
  },
  app: null,
  hardwareUsage: {},
};

/**
 * Maps the oldmarr options to the newmarr options
 * @param kind item kind to map
 * @param oldOptions oldmarr options for this item
 * @param appsMap map of old app ids to new app ids
 * @returns newmarr options for this item or null if the item did not exist in oldmarr
 */
export const mapOptions = <K extends WidgetKind>(
  kind: K,
  oldOptions: Extract<OldmarrWidgetDefinitions, { id: WidgetMapping[K] }>["options"],
  appsMap: Map<string, string>,
) => {
  logger.debug(`Mapping old homarr options for widget kind=${kind} options=${JSON.stringify(oldOptions)}`);
  if (optionMapping[kind] === null) {
    return null;
  }

  const mapping = optionMapping[kind];
  return objectEntries(mapping).reduce(
    (acc, [key, value]) => {
      const newValue = value(oldOptions as never, appsMap);
      logger.debug(`Mapping old homarr option kind=${kind} key=${key as string} newValue=${newValue as string}`);
      if (newValue !== undefined) {
        acc[key as string] = newValue;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  ) as WidgetComponentProps<K>["options"];
};
