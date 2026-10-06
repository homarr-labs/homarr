import { afterEach, describe, expect, it, vi } from "vitest";

import { probeRuntimeCapabilitiesAsync } from "./capability-probes";

describe("probeRuntimeCapabilitiesAsync", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports independently reachable runtime capabilities", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(
      probeRuntimeCapabilitiesAsync({
        kubernetesEnabled: true,
        workshopApiUrl: "https://workshop.example.com/",
        fetchImpl,
        getKubernetesVersionAsync: async () => ({ gitVersion: "v1.34.0" }),
      }),
    ).resolves.toEqual({
      kubernetes: { status: "available", detail: "v1.34.0" },
      workshop: { status: "available" },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://workshop.example.com/api/health",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("distinguishes disabled and unreachable capabilities", async () => {
    await expect(
      probeRuntimeCapabilitiesAsync({
        kubernetesEnabled: false,
        workshopApiUrl: "https://workshop.example.com",
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })),
      }),
    ).resolves.toEqual({
      kubernetes: { status: "disabled" },
      workshop: { status: "unavailable" },
    });
  });

  it("aborts a never-resolving Kubernetes request when the probe times out", async () => {
    vi.useFakeTimers();
    let kubernetesSignal: AbortSignal | undefined;
    const getKubernetesVersionAsync = vi.fn(
      async (signal: AbortSignal) =>
        await new Promise<never>((_, reject) => {
          kubernetesSignal = signal;
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );

    const result = probeRuntimeCapabilitiesAsync({
      kubernetesEnabled: true,
      workshopApiUrl: "https://workshop.example.com",
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })),
      getKubernetesVersionAsync,
    });

    await vi.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toEqual({
      kubernetes: { status: "unavailable" },
      workshop: { status: "available" },
    });
    expect(getKubernetesVersionAsync).toHaveBeenCalledOnce();
    expect(kubernetesSignal?.aborted).toBe(true);
  });
});
