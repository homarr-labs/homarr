export type CustomWidgetDomainErrorCode =
  | "BAD_GATEWAY"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_FOUND"
  | "PAYLOAD_TOO_LARGE"
  | "TOO_MANY_REQUESTS";

export class CustomWidgetDomainError extends Error {
  public readonly code: CustomWidgetDomainErrorCode;
  public readonly reason?: "timeout";
  public readonly retryAfterMs?: number;

  public constructor(input: {
    code: CustomWidgetDomainErrorCode;
    message: string;
    reason?: "timeout";
    retryAfterMs?: number;
  }) {
    super(input.message);
    this.name = "CustomWidgetDomainError";
    this.code = input.code;
    this.reason = input.reason;
    this.retryAfterMs = input.retryAfterMs;
  }
}
