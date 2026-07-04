import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

const logger = createLogger({ module: "settleIntegrations" });

interface IntegrationLike {
  id: string;
  name: string;
  kind: string;
}

export async function settleIntegrationQueries<TIntegration extends IntegrationLike, TResult>(
  integrations: TIntegration[],
  fn: (integration: TIntegration) => Promise<TResult>,
): Promise<TResult[]> {
  const settled = await Promise.allSettled(integrations.map(async (integration) => fn(integration)));
  return settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    const integration = integrations[index];
    logger.warn(
      new ErrorWithMetadata(
        "Integration query failed",
        { integrationId: integration?.id, integrationKind: integration?.kind },
        { cause: result.reason },
      ),
    );
    return [];
  });
}
