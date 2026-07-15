export type CustomWidgetDomainErrorCode =
  | "BAD_GATEWAY"
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_FOUND"
  | "PAYLOAD_TOO_LARGE"
  | "TOO_MANY_REQUESTS";

export class CustomWidgetDomainError extends Error {
  public readonly code: CustomWidgetDomainErrorCode;
  public readonly retryAfterMs?: number;

  public constructor(input: {
    code: CustomWidgetDomainErrorCode;
    message: string;
    cause?: unknown;
    retryAfterMs?: number;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "CustomWidgetDomainError";
    this.code = input.code;
    this.retryAfterMs = input.retryAfterMs;
  }
}
