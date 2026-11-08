import { z } from "zod/v4";

export const ntfyEventSchema = z.object({
  event: z.string(),
});

// There are more properties, see: https://docs.ntfy.sh/subscribe/api/#json-message-format
// Not all properties are required for this use case.
const ntfySequenceSchema = z.object({
  id: z.string(),
  time: z.number(),
  topic: z.string(),
  sequence_id: z.optional(z.string()),
});

export const ntfyNotificationSchema = ntfySequenceSchema.extend({
  event: z.literal("message"),
  title: z.optional(z.string()),
  message: z.string(),
});

export const ntfyDeletionSchema = ntfySequenceSchema.extend({
  event: z.literal("message_delete"),
});

export type NtfyNotification = z.infer<typeof ntfyNotificationSchema>;
