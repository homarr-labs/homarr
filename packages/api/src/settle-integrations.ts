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
  throwOnAllFailures?: boolean;
}

export async function settleIntegrationQueries<TIntegration extends IntegrationLike, TResult>(
  integrations: TIntegration[],
  fn: (integration: TIntegration) => Promise<TResult>,
  options?: Options<TIntegration, TResult>,
): Promise<TResult[]> {
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

    errors.push(result.reason);

    if (options?.fallback && integration) {
      results.push(options.fallback(integration, result.reason));
      return;
    }
  });

  if (
    errors.length > 0 &&
    (results.length === 0 || (options?.throwOnAllFailures === true && errors.length === integrations.length))
  ) {
    throw errors[0];
  }

  return results;
}
