import { IconDownload } from "@tabler/icons-react";

import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("downloads", {
  icon: IconDownload,
  options: optionsBuilder.from(
    (factory) => ({
      columns: factory.multiSelect({
        defaultValue: ["integration", "name", "progress", "time", "actions"],
        options: (
          [
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
          ] as const
        ).map((value) => ({ value, label: (t) => t(`widget.downloads.items.${value}.columnTitle`) })),
        searchable: true,
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
        //defaultValue: [] as string[];
      }),
      filterIsWhitelist: factory.switch({
        defaultValue: false,
      }),
      applyFilterToRatio: factory.switch({
        defaultValue: true,
      }),
      enableRowSorting: factory.switch({
        defaultValue: false,
      }),
    }),
    {
      showCompletedUsenet: {
        shouldHide: () => false, //Get from presence of usenet client in integration list
      },
      showCompletedTorrent: {
        shouldHide: () => false, //Get from presence of torrent client in integration list
      },
      applyFilterToRatio: {
        shouldHide: () => false, //Get from presence of torrent client in integration list
      },
    },
  ),
  supportedIntegrations: ["sabNzbd", "nzbGet", "qBittorrent", "deluge", "transmission"],
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
