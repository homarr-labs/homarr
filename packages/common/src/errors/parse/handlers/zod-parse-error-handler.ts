import { ZodError } from "zod";
import { fromError } from "zod-validation-error";

import { ParseError } from "../parse-error";
import { ParseErrorHandler } from "./parse-error-handler";

export class ZodParseErrorHandler extends ParseErrorHandler {
  handleParseError(error: unknown): ParseError | undefined {
    if (!(error instanceof ZodError)) return undefined;

    // TODO: migrate to zod v4 prettfyError once it's released
    // https://v4.zod.dev/v4#error-pretty-printing
    const message = fromError(error, {
      issueSeparator: "\n",
      prefix: null,
    }).toString();

    return new ParseError(message, { cause: error });
  }
}
