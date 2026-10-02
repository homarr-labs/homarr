import { z } from "zod/v4";

import { widgetKinds } from "@homarr/definitions";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";

import type { Item } from "~/app/[locale]/boards/_types";

const clipboardPrefix = "homarr-board-items:v1\n";

const clipboardPayloadSchema = z.object({
  version: z.literal(1),
  items: z
    .array(
      z.object({
        kind: z.enum(widgetKinds),
        options: z.record(z.string(), z.unknown()),
        integrationIds: z.array(z.string()),
        advancedOptions: itemAdvancedOptionsSchema,
        size: z.object({
          width: z.number().int().min(1).max(64),
          height: z.number().int().min(1).max(64),
        }),
      }),
    )
    .min(1)
    .max(100),
});

export type BoardItemClipboardPayload = z.infer<typeof clipboardPayloadSchema>;

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

export const parseBoardItemClipboard = (value: string): BoardItemClipboardPayload | null => {
  if (!isBoardItemClipboardText(value)) return null;

  try {
    const result = clipboardPayloadSchema.safeParse(JSON.parse(value.slice(clipboardPrefix.length)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
