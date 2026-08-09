import { Response } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { OverseerrIntegration } from "./overseerr-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const integration = new OverseerrIntegration({
  id: "overseerr-1",
  name: "Overseerr",
  url: "https://overseerr.example.com",
  externalUrl: null,
  decryptedSecrets: [{ kind: "apiKey", value: "test-key" }],
});

describe("Overseerr media request actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["approve", () => integration.approveRequestAsync(42)],
    ["decline", () => integration.declineRequestAsync(42)],
  ])("rejects %s when Overseerr returns a non-success response", async (_action, run) => {
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(run()).rejects.toMatchObject({
      name: "IntegrationResponseError",
      message: "Response from integration did not indicate success",
      cause: {
        name: "ResponseError",
        message: "Response did not indicate success",
        statusCode: 500,
      },
    });
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
