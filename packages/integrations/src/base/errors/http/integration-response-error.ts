import type { ResponseError } from "@homarr/common";

import type { IntegrationErrorData } from "../integration-error";
import { IntegrationError } from "../integration-error";

export class IntegrationResponseError extends IntegrationError {
  constructor(integration: IntegrationErrorData, { cause }: { cause: ResponseError }) {
    super(integration, "Response from integration did not indicate success", { cause });
  }

  get cause(): ResponseError {
    return this.cause;
  }
}
