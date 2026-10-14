import { Agent as HttpAgent } from "node:http";
import type { AgentOptions } from "node:https";
import type { LookupFunction } from "node:net";
import type { checkServerIdentity } from "node:tls";
import { create as createAxios } from "axios";
import type { EnvHttpProxyAgent, fetch as undiciFetch, RequestInfo, RequestInit, Response } from "undici";

import type { CertificateTrustMaterial } from "../certificates/runtime";
import { getHttpRequestSignal } from "./request-signal";
import { withTimeoutAsync } from "./timeout";
import { createCustomCheckServerIdentity, createTlsContextCache } from "./tls";
import { ResourceHttpAgent } from "./transport-agent";
import type { HttpTransportLogger } from "./transport-agent";
import type { HttpAgentOptions } from "./transport-agent";
import { ResourceHttpsAgent } from "./https-agent";
import type { ResourceHttpsAgentOptions } from "./https-agent";
import { ownDispatcher, ownNodeAgent } from "./ownership";
import { createNativeHttpsTlsRoles } from "./proxy-connector";

export interface HttpProxyResources {
  httpProxy: string;
  httpsProxy: string;
  noProxy: string;
}

export interface CertificateHttpResources {
  readTrustMaterialAsync: () => Promise<CertificateTrustMaterial>;
  fetch: typeof undiciFetch;
  proxy: HttpProxyResources;
  logger?: HttpTransportLogger;
  lookup?: LookupFunction;
  createDispatcher?: (options: HttpAgentOptions) => ResourceHttpAgent;
  createHttpsAgent?: (options: ResourceHttpsAgentOptions) => ResourceHttpsAgent;
  retirementGraceMs?: number;
}

type CertificateAgentOverride = Partial<{
  ca: string | string[];
  checkServerIdentity: typeof checkServerIdentity;
  lookup: LookupFunction;
}>;

type CertificateAgentOptions = Pick<
  EnvHttpProxyAgent.Options,
  "autoSelectFamily" | "bodyTimeout" | "httpProxy" | "httpsProxy" | "noProxy"
>;

const waitWithSignalAsync = <T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return operation;
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    void operation.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
};

export const createCertificateHttpRuntime = (resources: CertificateHttpResources) => {
  const tlsContexts = createTlsContextCache();
  const retirementGraceMs = resources.retirementGraceMs ?? 1000;
  if (!Number.isSafeInteger(retirementGraceMs) || retirementGraceMs < 0 || retirementGraceMs > 30000) {
    throw new Error("Agent retirement grace must be an integer between 0 and 30000 milliseconds");
  }
  const dispatchers = new Map<ResourceHttpAgent, ReturnType<typeof ownDispatcher>>();
  const httpsAgents = new Map<ResourceHttpsAgent, ReturnType<typeof ownNodeAgent>>();
  const retirements = new Set<Promise<void>>();
  const retirementFailures: unknown[] = [];
  const fetchAgents = new Map<string, ResourceHttpAgent>();
  const proxy = { ...resources.proxy };
  const proxyEnv = {
    HTTP_PROXY: proxy.httpProxy,
    HTTPS_PROXY: proxy.httpsProxy,
    NO_PROXY: proxy.noProxy,
  };
  const httpAgent = new HttpAgent({ proxyEnv });
  let version: string | undefined;
  let stopped = false;
  let generation = 0;
  const materialGenerations = new WeakMap<CertificateTrustMaterial, number>();

  const trackRetirement = (completion: Promise<void>) => {
    retirements.add(completion);
    void completion.then(
      () => retirements.delete(completion),
      (error: unknown) => {
        retirements.delete(completion);
        retirementFailures.push(error);
      },
    );
  };

  const joinRetirementsAsync = async () => {
    while (retirements.size) await Promise.allSettled(retirements);
    if (retirementFailures.length)
      throw new AggregateError([...retirementFailures], "Certificate agent retirement failed");
  };

  const ownedHttpAgent = ownNodeAgent(httpAgent, {
    onRetiring: () => {},
    onRetirement: trackRetirement,
    onReleased: () => {},
  });

  const invalidateAsync = async () => {
    generation++;
    fetchAgents.clear();
    tlsContexts.clear();
    for (const owned of dispatchers.values()) void owned.destroyAsync();
    for (const owned of httpsAgents.values()) void owned.destroyAsync();
    await joinRetirementsAsync();
  };

  const requireRunning = () => {
    if (stopped) throw new Error("Certificate HTTP runtime is stopped");
  };

  const readMaterialAsync = async () => {
    while (true) {
      requireRunning();
      const previousGeneration = generation;
      let material: CertificateTrustMaterial;
      try {
        material = await resources.readTrustMaterialAsync();
      } catch (error) {
        await invalidateAsync();
        throw error;
      }
      requireRunning();
      if (generation !== previousGeneration) continue;
      if (version !== undefined && version !== material.version) {
        const invalidation = invalidateAsync();
        const expectedGeneration = generation;
        await invalidation;
        requireRunning();
        if (generation !== expectedGeneration) continue;
      }
      version = material.version;
      materialGenerations.set(material, generation);
      return material;
    }
  };

  const requireCurrentMaterial = (material: CertificateTrustMaterial) => {
    requireRunning();
    if (materialGenerations.get(material) !== generation) {
      throw new Error("Certificate trust changed while constructing a client");
    }
  };

  const createAgent = (
    material: CertificateTrustMaterial,
    override?: CertificateAgentOverride,
    agentOptions?: CertificateAgentOptions,
  ) => {
    requireCurrentMaterial(material);
    const ca = override?.ca ?? material.ca;
    const tls = {
      ca,
      secureContext: tlsContexts.getTlsContext(ca),
      checkServerIdentity: override?.checkServerIdentity ?? createCustomCheckServerIdentity(material.trustedHostnames),
      ...((override?.lookup ?? resources.lookup) ? { lookup: override?.lookup ?? resources.lookup } : {}),
    };
    const options: HttpAgentOptions = {
      ...proxy,
      ...agentOptions,
      httpProxy: agentOptions?.httpProxy ?? proxy.httpProxy,
      httpsProxy: agentOptions?.httpsProxy ?? proxy.httpsProxy,
      noProxy: agentOptions?.noProxy ?? proxy.noProxy,
      logger: resources.logger,
      connect: tls,
      requestTls: tls,
      proxyTls: tls,
    };
    const agent = resources.createDispatcher?.(options) ?? new ResourceHttpAgent(options);
    const owned = ownDispatcher(agent, retirementGraceMs, {
      onRetiring: () => {
        for (const [key, cached] of fetchAgents) if (cached === agent) fetchAgents.delete(key);
      },
      onRetirement: trackRetirement,
      onReleased: () => dispatchers.delete(agent),
    });
    dispatchers.set(agent, owned);
    return agent;
  };

  const createCertificateAgentAsync = async (
    override?: CertificateAgentOverride,
    agentOptions?: CertificateAgentOptions,
  ) => createAgent(await readMaterialAsync(), override, agentOptions);

  const createHttpsAgent = (
    material: CertificateTrustMaterial,
    override?: Pick<AgentOptions, "ca" | "checkServerIdentity">,
  ) => {
    requireCurrentMaterial(material);
    if (process.versions.bun && (proxy.httpProxy || proxy.httpsProxy) && proxy.noProxy !== "*") {
      throw new Error("Configured HTTPS/Axios proxies require a verified proxy-capable agent on Bun");
    }
    const nativeTlsRoles = createNativeHttpsTlsRoles(material, tlsContexts.getTlsContext, override, resources.lookup);
    const options: ResourceHttpsAgentOptions = {
      ...nativeTlsRoles.target,
      nativeTlsRoles,
      proxyEnv,
    };
    const agent = resources.createHttpsAgent?.(options) ?? new ResourceHttpsAgent(options);
    const owned = ownNodeAgent(agent, {
      onRetiring: () => {},
      onRetirement: trackRetirement,
      onReleased: () => httpsAgents.delete(agent),
    });
    httpsAgents.set(agent, owned);
    return agent;
  };

  const createHttpsAgentAsync = async (override?: Pick<AgentOptions, "ca" | "checkServerIdentity">) =>
    createHttpsAgent(await readMaterialAsync(), override);

  const createAxiosCertificateInstanceAsync = async (override?: Pick<AgentOptions, "ca" | "checkServerIdentity">) => {
    let material = await readMaterialAsync();
    let httpsAgent = createHttpsAgent(material, override);
    const client = createAxios({ httpsAgent, httpAgent, proxy: false });
    client.interceptors.request.use(async (config) => {
      const signal = getHttpRequestSignal(config.signal as AbortSignal | undefined);
      signal?.throwIfAborted();
      const current = await readMaterialAsync();
      if (material.version !== current.version || !httpsAgents.get(httpsAgent)?.isLive()) {
        material = current;
        httpsAgent = createHttpsAgent(current, override);
      }
      config.httpsAgent = httpsAgent;
      config.httpAgent = httpAgent;
      config.proxy = false;
      config.signal = signal;
      return config;
    });
    return client;
  };

  const executeFetchAsync = async (
    url: RequestInfo,
    options?: RequestInit & { timeout?: number; bodyTimeout?: number },
    requestSignal?: AbortSignal,
  ): Promise<Response> => {
    requireRunning();
    requestSignal?.throwIfAborted();
    let agent = options?.dispatcher;
    if (!agent) {
      const material = await waitWithSignalAsync(readMaterialAsync(), requestSignal);
      requestSignal?.throwIfAborted();
      const key = String(options?.bodyTimeout);
      agent = fetchAgents.get(key);
      if (!agent) {
        if (fetchAgents.size >= 8) {
          const oldest = fetchAgents.entries().next().value;
          if (oldest) {
            fetchAgents.delete(oldest[0]);
            void dispatchers.get(oldest[1])?.closeAsync();
          }
        }
        requireRunning();
        const created = createAgent(
          material,
          undefined,
          options?.bodyTimeout !== undefined ? { bodyTimeout: options.bodyTimeout } : undefined,
        );
        fetchAgents.set(key, created);
        agent = created;
      }
    }
    const { bodyTimeout: _bodyTimeout, dispatcher: _dispatcher, ...fetchOptions } = options ?? {};
    requestSignal?.throwIfAborted();
    return resources.fetch(url, { ...fetchOptions, signal: requestSignal, dispatcher: agent });
  };

  const fetchWithTrustedCertificatesAsync = (
    url: RequestInfo,
    options?: RequestInit & { timeout?: number; bodyTimeout?: number },
  ): Promise<Response> => {
    const requestSignal = getHttpRequestSignal(options?.signal);
    if (options?.timeout) {
      return withTimeoutAsync(
        (signal) => executeFetchAsync(url, options, AbortSignal.any([signal, requestSignal ?? signal])),
        options.timeout,
      );
    }
    return executeFetchAsync(url, options, requestSignal);
  };

  let disposal: Promise<void> | undefined;
  const disposeAsync = () => {
    if (!disposal) {
      stopped = true;
      void ownedHttpAgent.destroyAsync();
      disposal = invalidateAsync();
    }
    return disposal;
  };

  return {
    createCertificateAgentAsync,
    createHttpsAgentAsync,
    createAxiosCertificateInstanceAsync,
    fetchWithTrustedCertificatesAsync,
    invalidateAsync,
    disposeAsync,
  };
};

export type CertificateHttpRuntime = ReturnType<typeof createCertificateHttpRuntime>;
