import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("~/env", () => ({ env: { BASE_URL: "https://homarr.example.com/" } }));

import { GET } from "./route";

const request = new NextRequest("http://internal-container:3000/well-known/oauth-protected-resource", {
  headers: {
    host: "internal-container:3000",
    "x-forwarded-host": "untrusted.example.com",
    "x-forwarded-proto": "http",
  },
});

describe("MCP OAuth metadata", () => {
  test("uses the configured public base URL for authorization server metadata", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ path: ["oauth-authorization-server"] }),
    });

    await expect(response.json()).resolves.toMatchObject({
      issuer: "https://homarr.example.com",
      authorization_endpoint: "https://homarr.example.com/api/mcp/oauth/authorize",
    });
  });

  test("preserves a path-inserted authorization server issuer", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ path: ["oauth-authorization-server", "api", "mcp", "mcp"] }),
    });

    await expect(response.json()).resolves.toMatchObject({
      issuer: "https://homarr.example.com/api/mcp/mcp",
      authorization_endpoint: "https://homarr.example.com/api/mcp/oauth/authorize",
    });
  });

  test("preserves the transport path in protected resource metadata", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ path: ["oauth-protected-resource", "api", "mcp", "mcp"] }),
    });

    await expect(response.json()).resolves.toEqual({
      resource: "https://homarr.example.com/api/mcp/mcp",
      authorization_servers: ["https://homarr.example.com"],
    });
  });

  test("returns the public origin for root protected resource metadata", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ path: ["oauth-protected-resource"] }),
    });

    await expect(response.json()).resolves.toEqual({
      resource: "https://homarr.example.com",
      authorization_servers: ["https://homarr.example.com"],
    });
  });
});
