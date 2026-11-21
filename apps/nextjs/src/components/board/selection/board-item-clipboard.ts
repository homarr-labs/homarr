import { widgetKinds } from "@homarr/definitions";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

import type { Item } from "~/app/[locale]/boards/_types";

const clipboardPrefix = "homarr-board-items:v1\n";

export interface BoardItemClipboardPayload {
  version: 1;
  items: {
    kind: (typeof widgetKinds)[number];
    options: Record<string, unknown>;
    integrationIds: string[];
    advancedOptions: BoardItemAdvancedOptions;
    size: { width: number; height: number };
  }[];
}

export const serializeBoardItemsForClipboard = (items: readonly Item[], layoutId: string): string => {
  const clipboardItems = items.flatMap((item) => {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) return [];

    return [
      {
        kind: item.kind,
        options: item.options,
        integrationIds: item.integrationIds,
        advancedOptions: item.advancedOptions,
        size: { width: layout.width, height: layout.height },
      },
    ];
  });

  if (clipboardItems.length === 0) throw new Error("No selected items are available in the current layout");

  return `${clipboardPrefix}${JSON.stringify({ version: 1, items: clipboardItems })}`;
};

export const isBoardItemClipboardText = (value: string): boolean => value.startsWith(clipboardPrefix);

export const parseBoardItemClipboard = async (value: string): Promise<BoardItemClipboardPayload | null> => {
  if (!isBoardItemClipboardText(value)) return null;

  try {
    const { parseBoardItemClipboardPayload } = await import("./board-item-clipboard-validation");
    return parseBoardItemClipboardPayload(JSON.parse(value.slice(clipboardPrefix.length)));
  } catch {
    return null;
  }
};
