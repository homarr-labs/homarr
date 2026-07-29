import { IconDownload } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { ExtendedDownloadClientItem } from "@homarr/integrations";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const columnsList = [
  "name",
  "progress",
  "size",
  "downSpeed",
  "upSpeed",
  "time",
  "state",
  "added",
  "ratio",
  "received",
  "sent",
  "category",
  "integration",
  "index",
  "type",
] as const satisfies (keyof ExtendedDownloadClientItem)[];

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
] as const satisfies readonly (typeof columnsList)[number][];

export const { definition, componentLoader } = createWidgetDefinition("downloads", {
  icon: IconDownload,
  mobile: {
    width: 2,
    height: 1,
    supportsCompactSummary: true,
    supportsDetailView: true,
  },
  refetchInterval: 5,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        columns: factory.multiSelect({
          defaultValue: ["name", "progress", "downSpeed", "time", "state"],
          options: columnsList.map((value) => ({
            value,
            label: (t) => t(`widget.downloads.items.${value}.columnTitle`),
          })),
          searchable: true,
        }),
        defaultSort: factory.select({
          defaultValue: "progress",
          options: sortColumns.map((value) => ({
            value,
            label: (t) => t(`widget.downloads.items.${value}.columnTitle`),
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
        activeTorrentThreshold: factory.number({
          validate: z.number().min(0),
          defaultValue: 0,
          step: 1,
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
  supportedIntegrations: getIntegrationKindsByCategory("downloadClient"),
}).withDynamicImport(() => import("./component"));
