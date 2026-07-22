import { afterEach, describe, expect, test, vi } from "vitest";

import { OidcProvider } from "../oidc/oidc-provider";
import { assertVerifiedEmailForCredentialsLinking } from "../oidc/verified-email";

const mockEnv = vi.hoisted(() => ({
  AUTH_OIDC_CLIENT_ID: "client-id",
  AUTH_OIDC_CLIENT_NAME: "OIDC",
  AUTH_OIDC_CLIENT_SECRET: "client-secret",
  AUTH_OIDC_ENABLE_DANGEROUS_ACCOUNT_LINKING: false,
  AUTH_OIDC_ENABLE_DANGEROUS_CREDENTIALS_LINKING: false,
  AUTH_OIDC_FORCE_USERINFO: false,
  AUTH_OIDC_ISSUER: "https://example.com",
  AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE: undefined,
  AUTH_OIDC_SCOPE_OVERWRITE: "openid email profile",
  AUTH_OIDC_TOKEN_ENDPOINT_AUTH_METHOD: "client_secret_basic" as const,
}));

vi.mock("../../env", () => ({ env: mockEnv }));
vi.mock("next-auth", () => ({ customFetch: Symbol("customFetch") }));

afterEach(() => {
  mockEnv.AUTH_OIDC_ENABLE_DANGEROUS_CREDENTIALS_LINKING = false;
});

describe("assertVerifiedEmailForCredentialsLinking", () => {
  test("allows a strictly verified OIDC email when credentials linking is enabled", () => {
    expect(() =>
      assertVerifiedEmailForCredentialsLinking({ email: "test@example.com", email_verified: true }, true),
    ).not.toThrow();
  });

  test.each([
    { email: "test@example.com", email_verified: false },
    { email: "test@example.com", email_verified: "true" },
    { email_verified: true },
    { email: null, email_verified: true },
    { email: " ", email_verified: true },
    {},
  ])("rejects an OIDC profile without a strictly verified email when credentials linking is enabled", (profile) => {
    expect(() => assertVerifiedEmailForCredentialsLinking(profile, true)).toThrow(
      "OIDC provider did not return a verified email while credentials linking is enabled",
    );
  });

  test("does not require the claim when credentials linking is disabled", () => {
    expect(() => assertVerifiedEmailForCredentialsLinking({}, false)).not.toThrow();
  });

  test("OIDC provider rejects an unverified profile when credentials linking is enabled", () => {
    mockEnv.AUTH_OIDC_ENABLE_DANGEROUS_CREDENTIALS_LINKING = true;
    const provider = OidcProvider(null);
    expect(provider.allowDangerousEmailAccountLinking).toBe(true);
    const mapProfile = provider.profile;
    if (!mapProfile) throw new Error("Expected OIDC profile mapper to be defined");

    expect(() =>
      mapProfile(
        {
          sub: "subject",
          preferred_username: "test",
          email: "test@example.com",
          email_verified: false,
        },
        {},
      ),
    ).toThrow("OIDC provider did not return a verified email while credentials linking is enabled");
  });

  test("OIDC provider accepts an unverified profile when credentials linking is disabled", () => {
    const provider = OidcProvider(null);
    const mapProfile = provider.profile;
    if (!mapProfile) throw new Error("Expected OIDC profile mapper to be defined");

    expect(() =>
      mapProfile(
        {
          sub: "subject",
          preferred_username: "test",
          email: "test@example.com",
          email_verified: false,
        },
        {},
      ),
    ).not.toThrow();
  });
});
