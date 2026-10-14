import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import type { IntegrationExecutionContext, IntegrationTransportResources } from "./contracts";

export const withIntegrationTestingAsync = async <T>(
  integration: IntegrationInput,
  context: IntegrationExecutionContext,
  transport: IntegrationTransportResources,
  operation: (input: IntegrationTestingInput) => Promise<T>,
) => {
  context.signal.throwIfAborted();
  const lease = await transport.acquireTestingAsync(integration, context);
  try {
    context.signal.throwIfAborted();
    return await operation(lease.input);
  } finally {
    if (lease.ownership === "owned") await lease.releaseAsync();
  }
};
