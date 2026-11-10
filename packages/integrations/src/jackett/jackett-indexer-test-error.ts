import type { IntegrationErrorData } from "../base/errors/integration-error";
import { IntegrationError } from "../base/errors/integration-error";

export class JackettIndexerTestError extends IntegrationError {
  constructor(integration: IntegrationErrorData, failures: string[], total: number) {
    super(integration, `${failures.length} of ${total} Jackett indexers failed: ${failures.join(", ")}`, {});
  }
}
