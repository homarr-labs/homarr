import { Response } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { TraefikIntegration } from "./traefik-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const integration = new TraefikIntegration({
  id: "traefik-1",
  name: "Traefik",
  url: "https://traefik.example.com",
  externalUrl: null,
  decryptedSecrets: [],
});

describe("TraefikIntegration response bounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url) => {
      const path = new URL(url.toString()).pathname;
      if (path === "/api/version") return Promise.resolve(jsonResponse({ Version: "3.0.0" }));
      if (path === "/api/http/routers") {
        return Promise.resolve(
          jsonResponse(Array.from({ length: 250 }, (_, index) => ({ name: `router-${index}`, status: "enabled" }))),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });
  });

  it("caps detailed resource allocation while retaining bounded summary counts", async () => {
    const result = await integration.getDashboardDataAsync();

    expect(result.resources).toHaveLength(200);
    expect(result.resources.at(-1)?.name).toBe("router-199");
    expect(result.http.routers.total).toBe(250);
  });
});

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
