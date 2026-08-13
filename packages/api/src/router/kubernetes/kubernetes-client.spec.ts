import { KubeConfig } from "@kubernetes/client-node";
import { describe, expect, test, vi } from "vitest";

import { KubernetesClientRegistry, KubernetesContextNotFoundError } from "./kubernetes-client";

const createRegistry = () => {
  const kubeConfig = new KubeConfig();
  const contextNames = ["home", "remote", "metrics-degraded"];
  kubeConfig.loadFromOptions({
    clusters: contextNames.map((name) => ({ name, server: `https://${name}.example` })),
    users: contextNames.map((name) => ({ name, token: `${name}-token` })),
    contexts: contextNames.map((name) => ({ name, cluster: name, user: name })),
    currentContext: "home",
  });
  return new KubernetesClientRegistry(kubeConfig);
};

describe("KubernetesClientRegistry", () => {
  test("isolates duplicate resource names by context", async () => {
    const registry = createRegistry();
    const home = registry.getClient("home");
    const remote = registry.getClient("remote");
    vi.spyOn(home.coreApi, "listNamespace").mockResolvedValue({ items: [{ metadata: { name: "default" } }] } as never);
    vi.spyOn(remote.coreApi, "listNamespace").mockResolvedValue({
      items: [{ metadata: { name: "default" } }],
    } as never);

    const [homeNamespaces, remoteNamespaces] = await Promise.all([
      home.coreApi.listNamespace(),
      remote.coreApi.listNamespace(),
    ]);

    expect(homeNamespaces.items[0]?.metadata?.name).toBe("default");
    expect(remoteNamespaces.items[0]?.metadata?.name).toBe("default");
    expect(home).not.toBe(remote);
    expect(home.kubeConfig.getCurrentContext()).toBe("home");
    expect(remote.kubeConfig.getCurrentContext()).toBe("remote");
  });

  test("lists unavailable and metrics-degraded contexts without failing healthy contexts", async () => {
    const registry = createRegistry();
    for (const contextId of ["home", "remote", "metrics-degraded"]) {
      const client = registry.getClient(contextId);
      vi.spyOn(client.versionApi, "getCode").mockResolvedValue({} as never);
      vi.spyOn(client.metricsProbeApi, "listClusterCustomObject").mockResolvedValue({ items: [] } as never);
    }
    registry.getClient("remote").versionApi.getCode = vi.fn().mockRejectedValue(new Error("offline"));
    registry.getClient("metrics-degraded").metricsProbeApi.listClusterCustomObject = vi
      .fn()
      .mockRejectedValue(new Error("no metrics"));

    const result = await registry.getContextsAsync();

    expect(result.defaultContextId).toBe("home");
    expect(result.contexts).toEqual([
      { contextId: "home", name: "home", status: "available", metricsStatus: "available", isDefault: true },
      { contextId: "remote", name: "remote", status: "unavailable", metricsStatus: "unknown", isDefault: false },
      {
        contextId: "metrics-degraded",
        name: "metrics-degraded",
        status: "degraded",
        metricsStatus: "unavailable",
        isDefault: false,
      },
    ]);
  });

  test("times out an unresponsive context without delaying healthy contexts", async () => {
    vi.useFakeTimers();
    try {
      const registry = createRegistry();
      for (const contextId of ["home", "remote", "metrics-degraded"]) {
        const client = registry.getClient(contextId);
        vi.spyOn(client.versionApi, "getCode").mockResolvedValue({} as never);
        vi.spyOn(client.metricsProbeApi, "listClusterCustomObject").mockResolvedValue({ items: [] } as never);
      }
      let observedSignal: AbortSignal | undefined;
      vi.spyOn(registry.getClient("remote").versionApi, "getCode").mockImplementation(async (_request, options) => {
        const middleware = (
          options as { middleware?: { pre?: (request: unknown) => { toPromise: () => Promise<unknown> } }[] }
        ).middleware?.[0];
        await middleware?.pre?.({ setSignal: (signal: AbortSignal) => (observedSignal = signal) }).toPromise();
        return await new Promise<never>(() => undefined);
      });

      const resultPromise = registry.getContextsAsync(50);
      await vi.advanceTimersByTimeAsync(50);
      const result = await resultPromise;

      expect(observedSignal?.aborted).toBe(true);
      expect(result.contexts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ contextId: "home", status: "available" }),
          expect.objectContaining({ contextId: "remote", status: "unavailable" }),
        ]),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test("aborts a timed-out node metrics request", async () => {
    vi.useFakeTimers();
    try {
      const client = createRegistry().getClient("home");
      let observedSignal: AbortSignal | undefined;
      vi.spyOn(client.metricsProbeApi, "listClusterCustomObject").mockImplementation(async (_request, options) => {
        const middleware = (
          options as { middleware?: { pre?: (request: unknown) => { toPromise: () => Promise<unknown> } }[] }
        ).middleware?.[0];
        await middleware?.pre?.({ setSignal: (signal: AbortSignal) => (observedSignal = signal) }).toPromise();
        return await new Promise<never>(() => undefined);
      });

      const resultPromise = client.getNodeMetricsAsync(50);
      const rejection = expect(resultPromise).rejects.toThrow("Kubernetes context probe timed out");
      await vi.advanceTimersByTimeAsync(50);

      await rejection;
      expect(observedSignal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test("rejects unknown context IDs", () => {
    expect(() => createRegistry().getClient("missing")).toThrow(KubernetesContextNotFoundError);
  });

  test("uses the first configured context when current-context is empty", async () => {
    const kubeConfig = new KubeConfig();
    kubeConfig.loadFromOptions({
      clusters: [{ name: "first", server: "https://first.example" }],
      users: [{ name: "first", token: "token" }],
      contexts: [{ name: "first", cluster: "first", user: "first" }],
      currentContext: "",
    });
    const registry = new KubernetesClientRegistry(kubeConfig);
    const client = registry.getClient("first");
    vi.spyOn(client.versionApi, "getCode").mockResolvedValue({} as never);
    vi.spyOn(client.metricsProbeApi, "listClusterCustomObject").mockResolvedValue({ items: [] } as never);

    const result = await registry.getContextsAsync();

    expect(result.defaultContextId).toBe("first");
    expect(result.contexts[0]).toEqual(expect.objectContaining({ contextId: "first", isDefault: true }));
  });
});
