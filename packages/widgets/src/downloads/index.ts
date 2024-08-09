import { IconDownload } from "@tabler/icons-react";

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
const columnsSort = columnsList.filter((column) => !["actions", "id", "state"].includes(column));

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("downloads", {
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
          !integrationKinds.some((integrationKind) => ["sabNzbd", "nzbGet"].includes(integrationKind)),
      },
      showCompletedTorrent: {
        shouldHide: (_, integrationKinds) =>
          !integrationKinds.some((integrationKind) =>
            ["qBittorrent", "deluge", "transmission"].includes(integrationKind),
          ),
      },
      activeTorrentThreshold: {
        shouldHide: (_, integrationKinds) =>
          !integrationKinds.some((integrationKind) =>
            ["qBittorrent", "deluge", "transmission"].includes(integrationKind),
          ),
      },
      applyFilterToRatio: {
        shouldHide: (_, integrationKinds) =>
          !integrationKinds.some((integrationKind) =>
            ["qBittorrent", "deluge", "transmission"].includes(integrationKind),
          ),
      },
    },
  ),
  supportedIntegrations: ["sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"],
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
