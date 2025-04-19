import { z } from "zod";

// There are more properties, see: https://docs.ntfy.sh/subscribe/api/#json-message-format
// Not all properties are required for this use case.
export const ntfyNotificationSchema = z.object({
  id: z.string(),
  time: z.number(),
  event: z.literal("message"), // we only care about messages
  topic: z.string(),
  title: z.optional(z.string()),
  message: z.string(),
});
