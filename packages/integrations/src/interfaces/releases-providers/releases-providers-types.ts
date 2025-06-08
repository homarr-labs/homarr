import { z } from "zod";

export interface ReleasesVersionFilter {
  prefix?: string;
  precision: number;
  suffix?: string;
}

const _detailsProviderSchema = z
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
  .optional();

export type DetailsProviderResponse = z.infer<typeof _detailsProviderSchema>;

const _releaseProviderSchema = z.object({
  latestRelease: z.string(),
  latestReleaseAt: z.date(),
  releaseUrl: z.string().optional(),
  releaseDescription: z.string().optional(),
  isPreRelease: z.boolean().optional(),
});

export type ReleaseProviderResponse = z.infer<typeof _releaseProviderSchema>;

const _releasesRepositorySchema = z.object({
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

export type ReleasesRepository = z.infer<typeof _releasesRepositorySchema>;

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
      error: z.object({
        code: z.string().optional(),
        message: z.string().optional(),
      }),
    }),
  );

export type ReleasesResponse = z.infer<typeof _releasesReponseSchema>;
