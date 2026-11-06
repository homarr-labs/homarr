import type { IntegrationErrorData } from "../base/errors/integration-error";
import { IntegrationError } from "../base/errors/integration-error";

export type FrigateAuthenticationFailureReason =
  | "cookie"
  | "profileMismatch"
  | "login"
  | "profile"
  | "stats"
  | "redirect";

export class FrigateAuthenticationError extends IntegrationError {
  constructor(
    integration: IntegrationErrorData,
    public readonly reason: FrigateAuthenticationFailureReason,
  ) {
    super(integration, `Frigate authentication failed: ${reason}`, {});
    this.name = `Frigate${reason}Error`;
  }
}
