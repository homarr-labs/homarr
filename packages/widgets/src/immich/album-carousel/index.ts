import { IconChevronLeft, IconChevronRight, IconPhoto, IconPlayerPause } from "@tabler/icons-react";
import z from "zod";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { createWidgetDefinition, widgetQueryInputMatches } from "../../definition";
import { optionsBuilder } from "../../options";
import { ALL_PHOTOS_ALBUM_ID } from "./constants";

export const { definition, componentLoader } = createWidgetDefinition("immich-albumCarousel", {
  icon: IconPhoto,
  queryKey: [["widget", "immich", "getAlbum"]],
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      integrationId: scope.integrationIds[0] ?? "",
      albumId:
        typeof scope.options.albumId === "string" && scope.options.albumId !== ALL_PHOTOS_ALBUM_ID
          ? scope.options.albumId
          : undefined,
    }),
  refetchInterval: null,
  supportedIntegrations: ["immich"],
  integrationsRequired: true,
  maxIntegrations: 1,
  contextActions({ widgetStateRef }) {
    const call = (key: string) => () => {
      const action = widgetStateRef?.current?.[key];
      if (typeof action === "function") action();
    };
    const disabled = (key: string) => typeof widgetStateRef?.current?.[key] !== "function";
    return [
      {
        key: "previousPhoto",
        label: (t) => t("widget.immich-albumCarousel.actions.previousPhoto"),
        icon: IconChevronLeft,
        disabled: disabled("previousPhoto"),
        onClick: call("previousPhoto"),
      },
      {
        key: "nextPhoto",
        label: (t) => t("widget.immich-albumCarousel.actions.nextPhoto"),
        icon: IconChevronRight,
        disabled: disabled("nextPhoto"),
        onClick: call("nextPhoto"),
      },
      {
        key: "toggleSlideshow",
        label: (t) => t("widget.immich-albumCarousel.actions.toggleSlideshow"),
        icon: IconPlayerPause,
        disabled: disabled("toggleSlideshow"),
        onClick: call("toggleSlideshow"),
      },
    ];
  },
  createOptions() {
    return optionsBuilder.from((factory) => ({
      albumId: factory.integrationSelect({
        defaultValue: ALL_PHOTOS_ALBUM_ID,
        withDescription: true,
        clearable: true,
        useOptions: (integrationIds: string[]) => {
          const t = useScopedI18n("widget.immich-albumCarousel");
          const {
            data = [],
            isPending,
            isError,
          } = clientApi.widget.immich.getAlbums.useQuery(
            { integrationId: integrationIds[0] ?? "" },
            { enabled: integrationIds.length > 0, staleTime: 15 * 60 * 1000 },
          );
          return {
            data: [
              { value: ALL_PHOTOS_ALBUM_ID, label: t("allPhotos") },
              ...data.map((album) => ({ value: album.id, label: album.albumName })),
            ],
            isPending,
            isError,
          };
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
