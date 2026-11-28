import { expect, it, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { fetchOpenMeteoJsonAsync } from "./open-meteo";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

it("preserves safe connection timeout diagnostics before the request deadline", async () => {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search?name=private-city");
  const signal = new AbortController().signal;
  const cause = Object.assign(new Error(`Connection to ${url.toString()} timed out`), {
    code: "ETIMEDOUT",
    errno: -110,
    syscall: "connect",
    hostname: url.hostname,
  });
  vi.mocked(fetchWithTrustedCertificatesAsync).mockRejectedValueOnce(
    new TypeError("fetch failed", { cause: new AggregateError([cause], "Connection attempts failed") }),
  );

  const result = fetchOpenMeteoJsonAsync(url, signal);
  await expect(result).rejects.toMatchObject({
    message: "Open-Meteo response headers timed out",
    metadata: { host: url.hostname, elapsedMs: expect.any(Number) },
    cause: {
      name: "TypeError",
      cause: {
        name: "AggregateError",
        errors: [{ name: "Error", code: "ETIMEDOUT", errno: -110, syscall: "connect", hostname: url.hostname }],
      },
    },
  });
  await expect(result).rejects.not.toHaveProperty("cause.cause.errors.0.message");
  expect(vi.mocked(fetchWithTrustedCertificatesAsync)).toHaveBeenCalledWith(url.toString(), {
    signal,
    logOriginOnly: true,
  });
});
