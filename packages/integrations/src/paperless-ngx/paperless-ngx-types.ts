import { z } from "zod/v4";

export const paperlessNgxStatisticsSchema = z.object({
  documents_total: z.number(),
  documents_inbox: z
    .number()
    .nullable()
    .transform((value) => value ?? 0),
});

export const paperlessNgxPaginatedCountSchema = z.object({
  count: z.number(),
});

export interface PaperlessNgxStats {
  documentsTotal: number;
  documentsInbox: number;
  correspondentsCount: number;
  tagsCount: number;
  documentTypesCount: number;
}
