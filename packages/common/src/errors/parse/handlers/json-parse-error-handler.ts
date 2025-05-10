import { logger } from "@homarr/log";

import { ParseError } from "../parse-error";
import { ParseErrorHandler } from "./parse-error-handler";

export class JsonParseErrorHandler extends ParseErrorHandler {
  handleParseError(error: unknown): ParseError | undefined {
    if (!(error instanceof SyntaxError)) return undefined;

    logger.debug("Received JSON parse error", {
      message: error.message,
    });

    return new ParseError("Failed to parse json", { cause: error });
  }
}
