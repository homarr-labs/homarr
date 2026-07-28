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

interface IntegrationQuerySettlement<TResult> {
  results: TResult[];
  failedIntegrationCount: number;
}

const settleIntegrationQueriesInternal = async <TIntegration extends IntegrationLike, TResult>(
  integrations: TIntegration[],
  fn: (integration: TIntegration) => Promise<TResult>,
  options?: Options<TIntegration, TResult>,
): Promise<IntegrationQuerySettlement<TResult>> => {
  const settled = await Promise.allSettled(integrations.map(async (integration) => fn(integration)));
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

  const firstFailure = settled.find((result) => result.status === "rejected");
  if (
    options?.throwOnAllFailure === true &&
    settled.length > 0 &&
    settled.every((result) => result.status === "rejected") &&
    firstFailure?.status === "rejected"
  ) {
    throw firstFailure.reason;
  }

  if (options?.throwOnAllFailure !== false && results.length === 0 && errors.length > 0) {
    throw errors[0];
  }

  return {
    results,
    failedIntegrationCount: settled.filter((result) => result.status === "rejected").length,
  };
};

export async function settleIntegrationQueries<TIntegration extends IntegrationLike, TResult>(
  integrations: TIntegration[],
  fn: (integration: TIntegration) => Promise<TResult>,
  options?: Options<TIntegration, TResult>,
): Promise<TResult[]> {
  return (await settleIntegrationQueriesInternal(integrations, fn, options)).results;
}

export async function settleIntegrationQueriesWithProvenance<
  TIntegration extends IntegrationLike,
  TResult extends { isStale?: boolean },
>(
  integrations: TIntegration[],
  fn: (integration: TIntegration) => Promise<TResult>,
  options?: Options<TIntegration, TResult>,
): Promise<IntegrationQuerySettlement<TResult> & IntegrationQueryProvenance> {
  const settlement = await settleIntegrationQueriesInternal(integrations, fn, options);

  return {
    ...settlement,
    staleIntegrationCount: settlement.results.filter((result) => result.isStale === true).length,
  };
}
