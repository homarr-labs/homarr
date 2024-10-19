import { IconDownload } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { ExtendedDownloadClientItem } from "@homarr/integrations";
import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const columnsList = [
  "id",
  "actions",
  "added",
  "category",
  "downSpeed",
  "index",
  "integration",
  "name",
  "progress",
  "ratio",
  "received",
  "sent",
  "size",
  "state",
  "time",
  "type",
  "upSpeed",
] as const satisfies (keyof ExtendedDownloadClientItem)[];
const sortingExclusion = ["actions", "id", "state"] as const satisfies readonly (typeof columnsList)[number][];
const columnsSort = columnsList.filter((column) =>
  sortingExclusion.some((exclusion) => exclusion !== column),
) as Exclude<typeof columnsList, (typeof sortingExclusion)[number]>;

export const { definition, componentLoader } = createWidgetDefinition("downloads", {
  icon: IconDownload,
  options: optionsBuilder.from(
    (factory) => ({
      columns: factory.multiSelect({
        defaultValue: ["integration", "name", "progress", "time", "actions"],
        options: columnsList.map((value) => ({
          value,
          label: (t) => t(`widget.downloads.items.${value}.columnTitle`),
        })),
        searchable: true,
      }),
      enableRowSorting: factory.switch({
        defaultValue: false,
      }),
      defaultSort: factory.select({
        defaultValue: "type",
        options: columnsSort.map((value) => ({
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
      activeTorrentThreshold: factory.number({
        //in KiB/s
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
    }),
    {
      defaultSort: {
        shouldHide: (options) => !options.enableRowSorting,
      },
      descendingDefaultSort: {
        shouldHide: (options) => !options.enableRowSorting,
      },
      showCompletedUsenet: {
        shouldHide: (_, integrationKinds) =>
          !getIntegrationKindsByCategory("usenet").some((kinds) => integrationKinds.includes(kinds)),
      },
      showCompletedTorrent: {
        shouldHide: (_, integrationKinds) =>
          !getIntegrationKindsByCategory("torrent").some((kinds) => integrationKinds.includes(kinds)),
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
  ),
  supportedIntegrations: getIntegrationKindsByCategory("downloadClient"),
}).withDynamicImport(() => import("./component"));
