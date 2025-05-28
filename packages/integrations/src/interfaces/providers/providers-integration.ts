import { z } from "zod";

import type { ReleaseResponse, Repository } from "./providers-types";

export const errorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

const _detailsSchema = z
  .object({
    projectUrl: z.string().optional(),
    projectDescription: z.string().optional(),
    isFork: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    createdAt: z.date().optional(),
    starsCount: z.number().optional(),
    openIssues: z.number().optional(),
    forksCount: z.number().optional(),
  })
  .or(
    z.object({
      error: errorSchema,
    }),
  );

export type DetailsResponse = z.infer<typeof _detailsSchema>;

export interface ProviderIntegration {
  getReleasesAsync(repositories: Repository[]): Promise<ReleaseResponse[]>;
}
