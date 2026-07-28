import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

const logger = createLogger({ module: "settleIntegrations" });

interface IntegrationLike {
  id: string;
  name: string;
  kind: string;
}

interface Options<TIntegration extends IntegrationLike, TResult> {
  fallback?: (integration: TIntegration, error: unknown) => TResult;
  throwOnAllFailure?: boolean;
}

export interface IntegrationQueryProvenance {
  failedIntegrationCount: number;
  staleIntegrationCount: number;
}

export const getIntegrationQueryProvenance = (
  selectedIntegrationCount: number,
  results: readonly { isStale?: boolean }[],
): IntegrationQueryProvenance => ({
  failedIntegrationCount: Math.max(0, selectedIntegrationCount - results.length),
  staleIntegrationCount: results.filter((result) => result.isStale === true).length,
});

export async function settleIntegrationQueries<TIntegration extends IntegrationLike, TResult>(
  integrations: TIntegration[],
  fn: (integration: TIntegration) => Promise<TResult>,
  options?: Options<TIntegration, TResult>,
): Promise<TResult[]> {
  const settled = await Promise.allSettled(integrations.map(async (integration) => fn(integration)));
  const results = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    const integration = integrations[index];
    logger.warn(
      new ErrorWithMetadata(
        "Integration query failed",
        { integrationId: integration?.id, integrationKind: integration?.kind },
        { cause: result.reason },
      ),
    );
    if (options?.fallback && integration) return [options.fallback(integration, result.reason)];
    return [];
  });

  const firstFailure = settled.find((result) => result.status === "rejected");
  if (
    options?.throwOnAllFailure === true &&
    settled.length > 0 &&
    settled.every((result) => result.status === "rejected") &&
    firstFailure?.status === "rejected"
  ) {
    throw firstFailure.reason;
  }

  return results;
}
