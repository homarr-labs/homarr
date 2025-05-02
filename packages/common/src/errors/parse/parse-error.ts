export class ParseError extends Error {
  constructor(message: string, options?: { cause: Error }) {
    super(`Failed to parse data:\n${message}`, options);
  }

  get cause(): Error {
    return super.cause as Error;
  }
}
