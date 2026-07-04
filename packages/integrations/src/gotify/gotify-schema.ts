import { z } from "zod/v4";

// See: https://gotify.net/api-docs#/message/getMessages
export const gotifyMessageSchema = z.object({
  id: z.number(),
  appid: z.number(),
  date: z.string(),
  title: z.string(),
  message: z.string(),
  priority: z.number().optional(),
});

export const gotifyMessagesResponseSchema = z.object({
  messages: z.array(gotifyMessageSchema),
});

export const gotifyApplicationSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: z.string().nullable().optional(),
});

export const gotifyApplicationsResponseSchema = z.array(gotifyApplicationSchema);
