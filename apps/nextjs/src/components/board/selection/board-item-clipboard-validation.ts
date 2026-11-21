import { z } from "zod/v4";

import { widgetKinds } from "@homarr/definitions";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";

import type { BoardItemClipboardPayload } from "./board-item-clipboard";

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

export const parseBoardItemClipboardPayload = (value: unknown): BoardItemClipboardPayload | null => {
  const result = clipboardPayloadSchema.safeParse(value);
  return result.success ? result.data : null;
};
