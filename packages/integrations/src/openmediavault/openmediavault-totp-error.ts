import type { IntegrationErrorData } from "../base/errors/integration-error";
import { IntegrationError } from "../base/errors/integration-error";
import type { OpenMediaVaultConnectionFailureReason } from "../base/test-connection/test-connection-error";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";

const failureMessages = {
  totpSecretRequired:
    "OpenMediaVault requires a TOTP code for this account. Configure the TOTP secret, or use a separate admin account without TOTP.",
  totpSecretInvalid:
    "The TOTP secret must be the Base32 shared secret from OpenMediaVault two-factor enrollment, not a 6-digit code.",
  totpVerificationFailed:
    "OpenMediaVault rejected the TOTP code. Check that the shared secret is correct and that this server's clock is in sync with OpenMediaVault.",
  unsupportedChallenge:
    "OpenMediaVault requested a sign-in challenge other than TOTP. Homarr can only complete TOTP challenges.",
} as const satisfies Record<OpenMediaVaultConnectionFailureReason, string>;

export class OpenMediaVaultTotpError extends IntegrationError {
  public readonly reason: OpenMediaVaultConnectionFailureReason;

  constructor(integration: IntegrationErrorData, reason: OpenMediaVaultConnectionFailureReason) {
    super(integration, failureMessages[reason], {});
    this.name = "OpenMediaVaultTotpError";
    this.reason = reason;
  }

  public toConnectionResult(): TestingResult {
    return TestConnectionError.OpenMediaVaultResult(this.reason, this);
  }
}
