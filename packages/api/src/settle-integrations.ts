import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { getCachedIntegrationData } from "./integration-data-cache";

const logger = createLogger({ module: "settleIntegrations" });

interface IntegrationLike {
  id: string;
  name: string;
  kind: string;
}

interface Options<TIntegration extends IntegrationLike, TResult> {
  fallback?: (integration: TIntegration, error: unknown) => TResult;
  /** Widget procedure key, e.g. `downloads:getJobsAndStatuses:{"limitPerIntegration":50}` */
  queryKey?: string;
}

export const integrationQueryKey = (widget: string, procedure: string, params?: unknown) => {
  if (params === undefined) return `${widget}:${procedure}`;
  return `${widget}:${procedure}:${JSON.stringify(params)}`;
};

export async function settleIntegrationQueries<TIntegration extends IntegrationLike, TResult>(
  integrations: TIntegration[],
  fn: (integration: TIntegration) => Promise<TResult>,
  options?: Options<TIntegration, TResult>,
): Promise<TResult[]> {
  const queryKey = options?.queryKey;
  const runQuery = async (integration: TIntegration) => {
    if (queryKey) {
      return getCachedIntegrationData(integration.id, queryKey, () => fn(integration));
    }
    return fn(integration);
  };

  const settled = await Promise.allSettled(integrations.map(runQuery));
  const results: TResult[] = [];
  const errors: unknown[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      results.push(result.value);
      return;
    }

    const integration = integrations[index];
    logger.warn(
      new ErrorWithMetadata(
        "Integration query failed",
        { integrationId: integration?.id, integrationKind: integration?.kind },
        { cause: result.reason },
      ),
    );

    if (options?.fallback && integration) {
      results.push(options.fallback(integration, result.reason));
      return;
    }

    errors.push(result.reason);
  });

  if (results.length === 0 && errors.length > 0) {
    throw errors[0];
  }

  return results;
}
