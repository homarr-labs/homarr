import { z } from "zod/v4";

export const statusResponseSchema = z.object({
  queue: z.number(),
  processing: z.number(),
  processed: z.number(),
  processingFiles: z
    .array(
      z.object({
        name: z.string().nullable(),
        relativePath: z.string().nullable(),
        library: z.string().nullable(),
        step: z.string().nullable(),
        stepPercent: z.number(),
      }),
    )
    .optional()
    .transform((arr) => arr ?? []),
});

export const libraryStatusSchema = z.array(
  z.object({
    Name: z.string().nullable(),
    Status: z.number(),
    Count: z.number(),
  }),
);

export const shrinkageGroupsSchema = z.record(
  z.string(),
  z.object({
    Library: z.string().nullable(),
    OriginalSize: z.number(),
    FinalSize: z.number(),
    Items: z.number(),
    Difference: z.number().optional(),
  }),
);

export const workersResponseSchema = z.array(
  z.object({
    Uid: z.string(),
    NodeName: z.string().nullable(),
    RelativeFile: z.string().nullable(),
    CurrentPart: z.number(),
    CurrentPartName: z.string().nullable(),
    CurrentPartPercent: z.number(),
    StartedAt: z.string(),
    LastUpdate: z.string(),
    ProcessingTime: z
      .object({
        TotalSeconds: z.number().optional(),
      })
      .optional(),
    LibraryFile: z
      .object({
        OriginalSize: z.number(),
      })
      .optional(),
    Library: z
      .object({
        Name: z.string().nullable(),
      })
      .optional(),
  }),
);

export const upcomingFilesSchema = z.array(
  z.object({
    Uid: z.string(),
    Name: z.string().nullable(),
    RelativePath: z.string().nullable(),
    OriginalSize: z.number().nullable(),
    FinalSize: z.number().nullable(),
    Status: z.number(),
    Library: z.string().nullable(),
    Flow: z.string().nullable(),
    Node: z.string().nullable(),
    ProcessingTime: z
      .object({
        TotalSeconds: z.number().optional(),
      })
      .optional(),
  }),
);

export const recentlyFinishedSchema = z.array(
  z.object({
    Uid: z.string(),
    Name: z.string().nullable(),
    RelativePath: z.string().nullable(),
    OriginalSize: z.number().nullable(),
    FinalSize: z.number().nullable(),
    Status: z.number(),
    Library: z.string().nullable(),
    Flow: z.string().nullable(),
  }),
);
