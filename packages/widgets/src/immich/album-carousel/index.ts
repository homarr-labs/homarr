import { IconPhoto } from "@tabler/icons-react";
import z from "zod";

import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("immich-albumCarousel", {
  icon: IconPhoto,
  supportedIntegrations: ["immich"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      albumId: factory.integrationSelect({
        withDescription: true,
        clearable: true,
        useOptions: (integrationIds: string[]) => {
          const {
            data = [],
            isPending,
            isError,
          } = clientApi.widget.immich.getAlbums.useQuery(
            { integrationId: integrationIds[0] ?? "" },
            { enabled: integrationIds.length > 0, staleTime: 15 * 60 * 1000 },
          );
          return { data: data.map((album) => ({ value: album.id, label: album.albumName })), isPending, isError };
        },
      }),
      rotationIntervalSeconds: factory.number({
        defaultValue: 5,
        validate: z.number().min(1).max(3600),
        withDescription: true,
      }),
      showPhotoInfo: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
      randomizePhotos: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
