import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { MediaRelease } from "@homarr/integrations/types";

import { PUBLIC_INTEGRATION_ERROR, settleIntegrationQueries } from "../../settle-integrations";

interface MediaReleaseSource {
  id: string;
  name: string;
  kind: IntegrationKindByCategory<"mediaRelease">;
}

interface MediaReleaseLoadResult {
  releases: MediaRelease[];
  updatedAt: Date;
}

interface MediaReleaseIntegrationResult {
  integration: MediaReleaseSource & { updatedAt?: Date };
  releases: MediaRelease[];
  error?: string;
}

export async function getMediaReleaseResponse<TIntegration extends MediaReleaseSource>(
  integrations: TIntegration[],
  load: (integration: TIntegration) => Promise<MediaReleaseLoadResult>,
) {
  const results = await settleIntegrationQueries<TIntegration, MediaReleaseIntegrationResult>(
    integrations,
    async (integration) => {
      const { releases, updatedAt } = await load(integration);
      return {
        integration: {
          id: integration.id,
          name: integration.name,
          kind: integration.kind,
          updatedAt,
        },
        releases,
      };
    },
    {
      fallback: (integration) => ({
        integration: {
          id: integration.id,
          name: integration.name,
          kind: integration.kind,
        },
        releases: [],
        error: PUBLIC_INTEGRATION_ERROR,
      }),
      throwOnAllFailures: true,
    },
  );

  return {
    releases: results.flatMap(({ integration, releases }) => releases.map((release) => ({ ...release, integration }))),
    failedIntegrations: results.flatMap(({ integration, error }) =>
      error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
    ),
  };
}
