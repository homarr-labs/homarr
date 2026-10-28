// @vitest-environment node
import type { HeadersInit } from "undici";
import { Headers, Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
  process.env.CI = "true";
});

vi.mock("@homarr/redis", () => ({
  getIntegrationSessionStoreKey: (integrationId: string) => `session-store:${integrationId}`,
  createGetSetChannel: () => ({
    getAsync: () => Promise.resolve(null),
    setAsync: () => Promise.resolve(),
    removeAsync: () => Promise.resolve(),
  }),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  ErrorWithMetadata: class extends Error {},
}));

import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationSecret } from "../../base/types";
import { OpenMediaVaultIntegration } from "../openmediavault-integration";
import { generateTotpCode } from "../totp";

const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const timestampMs = 59_000;

const credentials = (totpSecret?: string): IntegrationSecret[] => [
  { kind: "username", value: "admin" },
  { kind: "password", value: "secret" },
  ...(totpSecret ? [{ kind: "totpSecret" as const, value: totpSecret }] : []),
];

const jsonResponse = (body: unknown, init?: { status?: number; cookies?: string[] }) => {
  const headers = new Headers();
  for (const cookie of init?.cookies ?? []) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(body), { status: init?.status ?? 200, headers });
};

const authenticated = (sessionId: string) => ({
  response: { status: "authenticated", username: "admin", sessionid: sessionId, permissions: { role: "admin" } },
  error: null,
});

const challenge = (kind = "totp") => ({
  response: {
    status: "challengeRequired",
    username: "admin",
    challenge: { kind, redirecturl: "/tfatotp/admin" },
  },
  error: null,
});

interface RecordedRequest {
  url: string;
  body: { service?: string; method?: string; params?: { code?: string } };
  cookie?: string;
}

const runLogin = async (secrets: IntegrationSecret[], responses: Response[]) => {
  const requests: RecordedRequest[] = [];
  const fetchAsync = (async (url: URL | string, init?: { body?: BodyInit; headers?: HeadersInit }) => {
    const headers = new Headers(init?.headers);
    requests.push({
      url: String(url),
      body: JSON.parse(String(init?.body)) as RecordedRequest["body"],
      cookie: headers.get("cookie") ?? undefined,
    });
    const response = responses.shift();
    if (!response) throw new Error("Unexpected request");
    return response;
  }) as IntegrationTestingInput["fetchAsync"];

  const integration = new OpenMediaVaultIntegration({
    id: "omv-test",
    name: "OMV",
    url: "http://omv.example",
    externalUrl: null,
    decryptedSecrets: secrets,
  });

  const result = await (
    integration as unknown as {
      testingAsync: (input: Pick<IntegrationTestingInput, "fetchAsync">) => Promise<TestingResult>;
    }
  ).testingAsync({ fetchAsync });

  return { result, requests };
};

const openMediaVaultFailure = (result: TestingResult) => {
  expect(result.success).toBe(false);
  if (result.success || result.error.type !== "openmediavault") {
    throw new Error(`Expected an OpenMediaVault connection error, received ${JSON.stringify(result)}`);
  }
  return result.error;
};

describe("OpenMediaVault login", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(timestampMs);
  });

  test("keeps accounts without a TOTP challenge on the existing login", async () => {
    const { result, requests } = await runLogin(credentials(), [jsonResponse(authenticated("session-1"))]);

    expect(result).toEqual({ success: true });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.body).toMatchObject({ service: "session", method: "login" });
  });

  test("does not call verify when a secret is stored but OpenMediaVault does not challenge", async () => {
    const { result, requests } = await runLogin(credentials(rfcSecret), [jsonResponse(authenticated("session-1"))]);

    expect(result).toEqual({ success: true });
    expect(requests.map((request) => request.body.method)).toEqual(["login"]);
  });

  test("completes a TOTP challenge with a fresh code on the login session cookie", async () => {
    const { result, requests } = await runLogin(credentials(rfcSecret), [
      jsonResponse(challenge(), { cookies: ["PHPSESSID=pending-session; Path=/; HttpOnly"] }),
      jsonResponse(authenticated("session-verified")),
    ]);

    expect(result).toEqual({ success: true });
    expect(requests).toHaveLength(2);
    expect(requests[1]?.cookie).toBe("PHPSESSID=pending-session");
    expect(requests[1]?.body).toEqual({
      service: "session",
      method: "verify",
      params: { code: generateTotpCode(rfcSecret, timestampMs) },
    });
  });

  test("fails clearly when TOTP is required and no secret is configured", async () => {
    const { result, requests } = await runLogin(credentials(), [jsonResponse(challenge())]);

    expect(openMediaVaultFailure(result).data.reason).toBe("totpSecretRequired");
    expect(openMediaVaultFailure(result).cause?.message).toMatch(/separate admin account without TOTP/);
    expect(requests.map((request) => request.body.method)).toEqual(["login"]);
  });

  test.each(["123456", "not-a-secret"])(
    "rejects invalid TOTP secret %j before contacting OpenMediaVault",
    async (secret) => {
      const { result, requests } = await runLogin(credentials(secret), [jsonResponse(authenticated("session-1"))]);

      expect(openMediaVaultFailure(result).data.reason).toBe("totpSecretInvalid");
      expect(openMediaVaultFailure(result).cause?.message).toMatch(/not a 6-digit code/);
      expect(requests).toHaveLength(0);
    },
  );

  test("reports a verification failure that mentions clock sync", async () => {
    const { result } = await runLogin(credentials(rfcSecret), [
      jsonResponse(challenge(), { cookies: ["PHPSESSID=pending-session; Path=/; HttpOnly"] }),
      jsonResponse({ response: null, error: { message: "Challenge verification failed." } }, { status: 400 }),
    ]);

    const error = openMediaVaultFailure(result);
    expect(error.data.reason).toBe("totpVerificationFailed");
    expect(error.cause?.message).toMatch(/clock is in sync/);
  });

  test("still accepts the legacy cookie session when login does not return a session id", async () => {
    const { result, requests } = await runLogin(credentials(), [
      jsonResponse(
        { response: null, error: null },
        {
          cookies: ["X-OPENMEDIAVAULT-SESSIONID=abc; Path=/", "X-OPENMEDIAVAULT-LOGIN=token; Path=/"],
        },
      ),
    ]);

    expect(result).toEqual({ success: true });
    expect(requests).toHaveLength(1);
  });
});
