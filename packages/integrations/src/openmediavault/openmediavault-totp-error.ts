import type { IntegrationErrorData } from "../base/errors/integration-error";
import { IntegrationError } from "../base/errors/integration-error";
import type { OpenMediaVaultConnectionFailureReason } from "../base/test-connection/test-connection-error";
import { TestConnectionError } from "../base/test-connection/test-connection-error";

const failureMessages = {
  totpSecretRequired: "Add the Base32 TOTP secret, or use a separate OpenMediaVault admin account without TOTP.",
  totpSecretInvalid: "Use the Base32 shared secret from OpenMediaVault two-factor enrollment, not a 6-digit code.",
  totpVerificationFailed: "OpenMediaVault rejected the TOTP code. Check the secret and sync both servers' clocks.",
  unsupportedChallenge: "Homarr only supports OpenMediaVault TOTP challenges.",
} satisfies Record<OpenMediaVaultConnectionFailureReason, string>;

export class OpenMediaVaultTotpError extends IntegrationError {
  constructor(
    integration: IntegrationErrorData,
    public readonly reason: OpenMediaVaultConnectionFailureReason,
  ) {
    super(integration, failureMessages[reason], {});
    this.name = "OpenMediaVaultTotpError";
  }

  public toConnectionResult() {
    return TestConnectionError.OpenMediaVaultResult(this.reason, this);
  }
}
