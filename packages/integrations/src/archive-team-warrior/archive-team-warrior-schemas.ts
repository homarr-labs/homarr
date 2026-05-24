import { z } from "zod/v4";

export const seesawFrameSchema = z.object({
  event_name: z.string(),
  message: z.unknown(),
});

export const warriorStatusMessageSchema = z.object({
  status: z.string(),
});

export const warriorBroadcastMessageSchema = z.object({
  message: z.string().nullable(),
});

export const warriorProjectSelectedMessageSchema = z.object({
  project: z.string().nullable(),
});

export const warriorProjectSchema = z.object({
  project_id: z.number().optional(),
  title: z.string().optional(),
  project_html: z.string().optional(),
  utc_deadline: z.string().nullable().optional(),
});

export const warriorItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  start_time: z.number().optional(),
});

export const projectRefreshMessageSchema = z
  .object({
    project: warriorProjectSchema.optional(),
    status: z.string().optional(),
    items: z.array(warriorItemSchema).optional(),
  })
  .nullable();

export const itemStatusMessageSchema = z.object({
  item_id: z.string(),
});

export const pipelineStartItemMessageSchema = z.object({
  item: warriorItemSchema,
});

export const bandwidthMessageSchema = z.object({
  received: z.number().optional(),
  sent: z.number().optional(),
  receiving: z.number().optional(),
  sending: z.number().optional(),
  session_id: z.string().optional(),
});

export type WarriorProject = z.infer<typeof warriorProjectSchema>;
export type WarriorItem = z.infer<typeof warriorItemSchema>;
export type SeesawFrame = z.infer<typeof seesawFrameSchema>;
