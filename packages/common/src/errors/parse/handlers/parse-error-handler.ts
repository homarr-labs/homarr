import type { ParseError } from "../parse-error";

export abstract class ParseErrorHandler {
  abstract handleParseError(error: unknown): ParseError | undefined;
}
