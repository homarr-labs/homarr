import { z } from "zod";

import { errorSchema } from "./providers-integration";

const _repositorySchema = z.object({
  providerKey: z.string(),
  identifier: z.string(),
  versionFilter: z
    .object({
      prefix: z.string().optional(),
      precision: z.number(),
      suffix: z.string().optional(),
    })
    .optional(),
});

export type Repository = z.infer<typeof _repositorySchema>;

const _releasesReponseSchema = z
  .object({
    identifier: z.string(),
    providerKey: z.string(),
    latestRelease: z.string().optional(),
    latestReleaseAt: z.date().optional(),
    releaseUrl: z.string().optional(),
    releaseDescription: z.string().optional(),
    isPreRelease: z.boolean().optional(),
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
      identifier: z.string(),
      providerKey: z.string(),
      error: errorSchema,
    }),
  );

export type ReleaseResponse = z.infer<typeof _releasesReponseSchema>;
