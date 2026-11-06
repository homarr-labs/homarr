"use client";

import { useCallback } from "react";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { useItemActions } from "~/components/board/items/item-actions";
import { useAddInPlaceEntry } from "./use-add-in-place-entry";

export const useEditItemInPlace = (item: SectionItem, onEdited?: () => void) => {
  const { editInPlace } = useAddInPlaceEntry();
  const { updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations, moveAndResizeItem } = useItemActions();

  return useCallback(
    () =>
      editInPlace({
        sectionId: item.sectionId,
        area: { x: item.xOffset, y: item.yOffset, w: item.width, h: item.height },
        itemId: item.id,
        kind: item.kind,
        appId: item.kind === "app" ? (item.options.appId as string | undefined) : undefined,
        value: {
          options: item.options,
          integrationIds: item.integrationIds,
          advancedOptions: item.advancedOptions,
        },
        onCommit: ({ options, integrationIds, advancedOptions }, size) => {
          updateItemOptions({ itemId: item.id, newOptions: options });
          updateItemAdvancedOptions({ itemId: item.id, newAdvancedOptions: advancedOptions });
          updateItemIntegrations({ itemId: item.id, newIntegrations: integrationIds });
          if (size) {
            moveAndResizeItem({
              itemId: item.id,
              xOffset: item.xOffset,
              yOffset: item.yOffset,
              width: size.width,
              height: size.height,
            });
          }
          onEdited?.();
        },
      }),
    [
      editInPlace,
      item,
      moveAndResizeItem,
      onEdited,
      updateItemAdvancedOptions,
      updateItemIntegrations,
      updateItemOptions,
    ],
  );
};
