import { z } from "zod/v4";

/** Installation identity is local metadata, never part of the runtime manifest. */
export const customWidgetWorkshopOriginSchema = z.object({
  endpoint: z.string().url(),
  submissionId: z.string().min(1).max(128),
  revision: z.number().int().positive(),
  fingerprint: z.string().length(64),
  installedFingerprint: z.string().length(64),
});
export type CustomWidgetWorkshopOrigin = z.infer<typeof customWidgetWorkshopOriginSchema>;

export function parseCustomWidgetWorkshopOrigin(value: string | null | undefined) {
  try {
    return customWidgetWorkshopOriginSchema.parse(JSON.parse(value ?? "null"));
  } catch {
    return null;
  }
}
