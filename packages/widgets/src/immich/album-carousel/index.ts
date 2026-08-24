import { IconChevronLeft, IconChevronRight, IconPhoto, IconPlayerPause } from "@tabler/icons-react";
import z from "zod";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { createWidgetDefinition, widgetQueryInputMatches } from "../../definition";
import { optionsBuilder } from "../../options";
import { ALL_PHOTOS_ALBUM_ID } from "./constants";

const createOptions = () =>
  optionsBuilder.from((factory) => ({
    albumId: factory.integrationSelect({
      defaultValue: ALL_PHOTOS_ALBUM_ID,
      withDescription: true,
      clearable: true,
      useOptions: (integrationIds: string[]) => {
        const t = useI18n("widget.immich-albumCarousel");
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

export const { definition, componentLoader } = createWidgetDefinition("immich-albumCarousel", {
  icon: IconPhoto,
  supportsAdvancedFocus: true,
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
  supportedIntegrations: ["immich", "mock"],
  integrationsRequired: true,
  maxIntegrations: 1,
  contextActions: ({ widgetRuntimeRef }) => {
    const actions = widgetRuntimeRef.current.actions;
    return [
      {
        key: "previousPhoto",
        label: "widget.immich-albumCarousel.actions.previousPhoto",
        icon: IconChevronLeft,
        disabled: typeof actions.previousPhoto !== "function",
        onClick: () => actions.previousPhoto?.(),
      },
      {
        key: "nextPhoto",
        label: "widget.immich-albumCarousel.actions.nextPhoto",
        icon: IconChevronRight,
        disabled: typeof actions.nextPhoto !== "function",
        onClick: () => actions.nextPhoto?.(),
      },
      {
        key: "toggleSlideshow",
        label: "widget.immich-albumCarousel.actions.toggleSlideshow",
        icon: IconPlayerPause,
        disabled: typeof actions.toggleSlideshow !== "function",
        onClick: () => actions.toggleSlideshow?.(),
      },
    ];
  },
  createOptions,
}).withDynamicImport(() => import("./component"));
