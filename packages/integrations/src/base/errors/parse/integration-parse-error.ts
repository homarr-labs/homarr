import type { ParseError } from "@homarr/common";

import type { IntegrationErrorData } from "../integration-error";
import { IntegrationError } from "../integration-error";

export class IntegrationParseError extends IntegrationError {
  constructor(integration: IntegrationErrorData, { cause }: { cause: ParseError }) {
    super(integration, "Failed to parse integration data", { cause });
  }

  get cause(): ParseError {
    return this.cause;
  }
}
