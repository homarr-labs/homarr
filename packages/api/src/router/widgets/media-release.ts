import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { mediaReleaseRequestHandler } from "@homarr/request-handler/media-release";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { getIntegrationQueryProvenance, settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const mediaReleasesProcedure = publicProcedure.concat(
  createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaRelease")),
);

type MediaReleaseIntegration = Parameters<typeof mediaReleaseRequestHandler.handler>[0];

const getMediaReleasesWithProvenanceAsync = async (integrations: MediaReleaseIntegration[]) => {
  const results = await settleIntegrationQueries(
    integrations,
    async (integration) => {
      const innerHandler = mediaReleaseRequestHandler.handler(integration, {});
      const { data, timestamp, isStale } = await innerHandler.getDataWithProvenanceAsync();

      return {
        integration: {
          id: integration.id,
          name: integration.name,
          kind: integration.kind,
          updatedAt: timestamp,
        },
        releases: data,
        isStale,
      };
    },
    { throwOnAllFailure: true },
  );
  const items = results.flatMap((result) =>
    result.releases.map((release) => ({
      ...release,
      integration: result.integration,
    })),
  );

  return {
    items,
    ...getIntegrationQueryProvenance(integrations.length, results),
  };
};

export const mediaReleaseRouter = createTRPCRouter({
  getMediaReleases: mediaReleasesProcedure.query(async ({ ctx }) => {
    return (await getMediaReleasesWithProvenanceAsync(ctx.integrations)).items;
  }),
  getMediaReleasesWithProvenance: mediaReleasesProcedure.query(async ({ ctx }) => {
    return await getMediaReleasesWithProvenanceAsync(ctx.integrations);
  }),
});
