import { z } from "zod/v4";

export const previewJournalEntrySchema = z.object({
  id: z.string(),
  requestId: z.string(),
  kind: z.enum(["query", "action"]),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string(),
  status: z.number().nullable(),
  durationMs: z.number().nonnegative(),
  simulated: z.boolean(),
  sessionRevision: z.number().int().nonnegative(),
  timestamp: z.number(),
});

export type CustomWidgetPreviewJournalEntry = z.infer<typeof previewJournalEntrySchema>;

export const isVerifiedPreviewEvidence = (entry: CustomWidgetPreviewJournalEntry) => {
  if (entry.kind === "query") return entry.status !== null && entry.status >= 200 && entry.status < 300;
  return entry.simulated || (entry.status !== null && entry.status >= 200 && entry.status < 300);
};

export const getPreviewEvidenceKey = (entry: CustomWidgetPreviewJournalEntry) =>
  `${entry.sessionRevision}:${entry.kind}:${entry.requestId}`;

export const parsePreviewJournalEntries = (entries: readonly unknown[]) =>
  entries.flatMap((entry) => {
    const parsed = previewJournalEntrySchema.safeParse(parsePreviewStoredValue(entry));
    return parsed.success ? [parsed.data] : [];
  });

export const parsePreviewStoredValue = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};
