import { IconDownload } from "@tabler/icons-react";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common";
import { getIntegrationKindsByCategory, getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";
import { DOWNLOAD_COLUMN_ACCESSORS } from "./helpers";
import { resolveDownloadsQueryInput } from "./query-input";

const columnTranslationKeys = {
  name: "common.field.name",
  progress: "widget.downloads.items.progress.columnTitle",
  size: "common.field.size",
  downSpeed: "widget.downloads.items.downSpeed.columnTitle",
  upSpeed: "widget.downloads.items.upSpeed.columnTitle",
  time: "widget.downloads.items.time.columnTitle",
  state: "common.field.state",
  added: "widget.downloads.items.added.columnTitle",
  ratio: "widget.downloads.items.ratio.columnTitle",
  received: "widget.downloads.items.received.columnTitle",
  sent: "widget.downloads.items.sent.columnTitle",
  category: "widget.downloads.items.category.columnTitle",
  integration: "common.field.source",
  index: "widget.downloads.items.index.columnTitle",
  type: "common.field.type",
} as const satisfies Record<(typeof DOWNLOAD_COLUMN_ACCESSORS)[number], string>;

const sortColumns = [
  "name",
  "progress",
  "size",
  "downSpeed",
  "upSpeed",
  "time",
  "added",
  "ratio",
  "received",
  "sent",
  "index",
  "type",
] as const satisfies readonly (typeof DOWNLOAD_COLUMN_ACCESSORS)[number][];

export const { definition, componentLoader } = createWidgetDefinition("downloads", {
  icon: IconDownload,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "downloads", "getJobsAndStatuses"]],
  queryMatcher: ({ input }, scope) => {
    if (!isRecord(input)) return false;
    const expected = resolveDownloadsQueryInput(scope.integrationIds, scope.options);
    return widgetQueryInputMatches(
      {
        ...resolveDownloadsQueryInput(scope.integrationIds, input),
        integrationIds: input.integrationIds,
        // Existing board snapshots can contain the query shape from before provider selection.
        selection: expected.selection,
        ...("selection" in input && { selection: input.selection }),
      },
      expected,
    );
  },
  refetchInterval: 10,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        columns: factory.multiSelect({
          defaultValue: ["name", "progress", "downSpeed", "time", "state"],
          options: DOWNLOAD_COLUMN_ACCESSORS.map((value) => ({
            value,
            label: (t) => t(columnTranslationKeys[value]),
          })),
          searchable: true,
        }),
        defaultSort: factory.select({
          defaultValue: "progress",
          options: sortColumns.map((value) => ({
            value,
            label: (t) => t(columnTranslationKeys[value]),
          })),
        }),
        descendingDefaultSort: factory.switch({
          defaultValue: false,
        }),
        showCompletedUsenet: factory.switch({
          defaultValue: true,
        }),
        showCompletedTorrent: factory.switch({
          defaultValue: true,
        }),
        showCompletedHttp: factory.switch({
          defaultValue: true,
        }),
        includeArchivedHistory: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        historyWindowDays: factory.number({
          defaultValue: 7,
          validate: z.number().int().min(1),
          step: 1,
          withDescription: true,
        }),
        activeTorrentThreshold: factory.number({
          validate: z.number().min(0),
          defaultValue: 0,
          step: 1,
          storedUnit: "kibibytesPerSecond",
        }),
        categoryFilter: factory.multiText({
          defaultValue: [] as string[],
          validate: z.string(),
        }),
        filterIsWhitelist: factory.switch({
          defaultValue: false,
        }),
        applyFilterToRatio: factory.switch({
          defaultValue: true,
        }),
        limitPerIntegration: factory.number({
          defaultValue: 50,
          validate: z.number().min(1),
          withDescription: true,
        }),
        columnOrder: factory.text({ defaultValue: "" }),
        columnWidths: factory.text({ defaultValue: "" }),
      }),
      {
        columnOrder: { shouldHide: () => true },
        columnWidths: { shouldHide: () => true },
        includeArchivedHistory: {
          shouldHide: (_, integrationKinds) => !integrationKinds.includes("sabNzbd"),
        },
        historyWindowDays: {
          shouldHide: ({ includeArchivedHistory }, integrationKinds) =>
            !integrationKinds.includes("sabNzbd") || !includeArchivedHistory,
        },
        showCompletedUsenet: {
          shouldHide: (_, integrationKinds) =>
            !getIntegrationKindsByCategory("usenet").some((kinds) => integrationKinds.includes(kinds)),
        },
        showCompletedTorrent: {
          shouldHide: (_, integrationKinds) =>
            !getIntegrationKindsByCategory("torrent").some((kinds) => integrationKinds.includes(kinds)),
        },
        showCompletedHttp: {
          shouldHide: (_, integrationKinds) =>
            !getIntegrationKindsByCategory("miscellaneous").some((kinds) => integrationKinds.includes(kinds)),
        },
        activeTorrentThreshold: {
          shouldHide: (_, integrationKinds) =>
            !getIntegrationKindsByCategory("torrent").some((kinds) => integrationKinds.includes(kinds)),
        },
        applyFilterToRatio: {
          shouldHide: (_, integrationKinds) =>
            !getIntegrationKindsByCategory("torrent").some((kinds) => integrationKinds.includes(kinds)),
        },
      },
    );
  },
  ...getWidgetIntegrationConfig("downloads"),
}).withDynamicImport(() => import("./component"));
