import { describe, expect, test } from "vitest";

import { assertVerifiedEmailForCredentialsLinking } from "../oidc/verified-email";

describe("assertVerifiedEmailForCredentialsLinking", () => {
  test("allows a strictly verified OIDC email when credentials linking is enabled", () => {
    expect(() => assertVerifiedEmailForCredentialsLinking({ email_verified: true }, true)).not.toThrow();
  });

  test.each([{ email_verified: false }, { email_verified: "true" }, {}])(
    "rejects an OIDC profile without a strictly verified email when credentials linking is enabled",
    (profile) => {
      expect(() => assertVerifiedEmailForCredentialsLinking(profile, true)).toThrow(
        "OIDC provider did not return a verified email while credentials linking is enabled",
      );
    },
  );

  test("does not require the claim when credentials linking is disabled", () => {
    expect(() => assertVerifiedEmailForCredentialsLinking({}, false)).not.toThrow();
  });
});
