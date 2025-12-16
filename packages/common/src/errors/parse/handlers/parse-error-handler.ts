import type { Logger } from "@homarr/core/infrastructure/logs";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { ParseError } from "../parse-error";

export abstract class ParseErrorHandler {
  protected logger: Logger;
  constructor(type: string) {
    this.logger = createLogger({ module: "parseErrorHandler", type });
  }

  protected logParseError(metadata?: Record<string, unknown>) {
    this.logger.debug("Received parse error", metadata);
  }

  abstract handleParseError(error: unknown): ParseError | undefined;
}
