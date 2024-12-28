import { objectEntries } from "@homarr/common";
import { logger } from "@homarr/log";

import type { WidgetComponentProps } from "../../../widgets/src/definition";
import { mapKind } from "./definitions";
import type { InversedWidgetMapping, OldmarrWidgetDefinitions, WidgetMapping } from "./definitions";

// This type enforces, that for all widget mappings there is a corresponding option mapping,
// each option of newmarr can be mapped from the value of the oldmarr options
type OptionMapping = {
  [WidgetKey in keyof InversedWidgetMapping]: InversedWidgetMapping[WidgetKey] extends null
    ? null
    : {
        [OptionsKey in keyof WidgetComponentProps<WidgetKey>["options"]]: (
          oldOptions: Extract<OldmarrWidgetDefinitions, { id: InversedWidgetMapping[WidgetKey] }>["options"],
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
    activeTorrentThreshold: (oldOptions) =>
      "speedLimitOfActiveTorrents" in oldOptions ? oldOptions.speedLimitOfActiveTorrents : undefined,
    applyFilterToRatio: (oldOptions) =>
      "displayRatioWithFilter" in oldOptions ? oldOptions.displayRatioWithFilter : undefined,
    categoryFilter: (oldOptions) => ("labelFilter" in oldOptions ? oldOptions.labelFilter : undefined),
    filterIsWhitelist: (oldOptions) =>
      "labelFilterIsWhitelist" in oldOptions ? oldOptions.labelFilterIsWhitelist : undefined,
    enableRowSorting: (oldOptions) => ("rowSorting" in oldOptions ? oldOptions.rowSorting : undefined),
    showCompletedTorrent: (oldOptions) =>
      "displayCompletedTorrents" in oldOptions ? oldOptions.displayCompletedTorrents : undefined,
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
    cpu: (oldOptions) =>
      "cpu" in oldOptions
        ? oldOptions.cpu
        : oldOptions.graphsOrder.some((graph) => graph.key === "cpu" && graph.subValues.enabled),
    memory: (oldOptions) =>
      "memory" in oldOptions
        ? oldOptions.memory
        : oldOptions.graphsOrder.some((graph) => graph.key === "ram" && graph.subValues.enabled),
    fahrenheit: (oldOptions) => ("fahrenheit" in oldOptions ? oldOptions.fahrenheit : undefined),
    fileSystem: (oldOptions) =>
      "fileSystem" in oldOptions
        ? oldOptions.fileSystem
        : oldOptions.graphsOrder.some((graph) => graph.key === "storage" && graph.subValues.enabled),
  },
  mediaTranscoding: {
    defaultView: (oldOptions) => oldOptions.defaultView,
    queuePageSize: (oldOptions) => oldOptions.queuePageSize,
  },
};

/**
 * Maps the oldmarr options to the newmarr options
 * @param type old widget type
 * @param oldOptions oldmarr options for this item
 * @param appsMap map of old app ids to new app ids
 * @returns newmarr options for this item or null if the item did not exist in oldmarr
 */
export const mapOptions = <K extends OldmarrWidgetDefinitions["id"]>(
  type: K,
  oldOptions: Extract<OldmarrWidgetDefinitions, { id: K }>["options"],
  appsMap: Map<string, string>,
) => {
  logger.debug(`Mapping old homarr options for widget type=${type} options=${JSON.stringify(oldOptions)}`);
  const kind = mapKind(type);
  if (!kind) {
    return null;
  }

  const mapping = optionMapping[kind];
  return objectEntries(mapping).reduce(
    (acc, [key, value]: [string, (oldOptions: Record<string, unknown>, appsMap: Map<string, string>) => unknown]) => {
      const newValue = value(oldOptions, appsMap);
      logger.debug(`Mapping old homarr option kind=${kind} key=${key} newValue=${newValue as string}`);
      if (newValue !== undefined) {
        acc[key] = newValue;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  ) as WidgetComponentProps<Exclude<WidgetMapping[K], null>>["options"];
};
