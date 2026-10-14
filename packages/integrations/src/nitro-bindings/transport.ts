import type { X509Certificate } from "node:crypto";
import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import type { LookupFunction } from "node:net";
import { checkServerIdentity, createSecureContext } from "node:tls";
import { create as createAxios, getAdapter } from "axios";
import { EnvHttpProxyAgent, fetch as undiciFetch } from "undici";

import type { CertificateTrustMaterial } from "@homarr/core/infrastructure/certificates/resources";

import type { IntegrationTestingInput } from "../base/integration";
import { TestConnectionService } from "../base/test-connection/test-connection-service";
import type { IntegrationExecutionContext, IntegrationTransportResources } from "../runtime/contracts";
import { sanitizeIntegrationTransportError } from "../runtime/transport-errors";
import { IntegrationBindingError, requireIntegrationProducer } from "./errors";
import type { IntegrationProducer } from "./errors";
import type { IntegrationBindingLifetime } from "./lifetime";
import { ownIntegrationNodeAgent } from "./node-agent";

export interface IntegrationTransportBindingResources {
  readonly nodeEnvironmentMode: "development" | "production" | "test";
  readonly trust: IntegrationProducer<{
    readTrustMaterialAsync(signal: AbortSignal): Promise<CertificateTrustMaterial>;
  }>;
  readonly proxy: {
    readonly httpProxy: string;
    readonly httpsProxy: string;
    readonly noProxy: string;
  };
  readonly lookup?: LookupFunction;
  readonly retirementGraceMs: number;
  readonly assertCurrentAsync: (context: IntegrationExecutionContext) => Promise<void>;
  readonly diagnostics: IntegrationProducer<{
    fetchCertificateAsync(url: URL, context: IntegrationExecutionContext): Promise<X509Certificate | undefined>;
  }>;
}

export const createIntegrationTransportBindings = (
  resources: IntegrationTransportBindingResources,
  lifetime: IntegrationBindingLifetime,
): IntegrationTransportResources => {
  const nodeEnvironmentMode = resources.nodeEnvironmentMode;
  if (nodeEnvironmentMode !== "development" && nodeEnvironmentMode !== "production" && nodeEnvironmentMode !== "test") {
    throw new TypeError("Integration transport requires a valid captured Node environment mode");
  }
  if (
    !Number.isSafeInteger(resources.retirementGraceMs) ||
    resources.retirementGraceMs < 0 ||
    resources.retirementGraceMs > 30000
  ) {
    throw new RangeError("Integration retirement grace must be between 0 and 30000 milliseconds");
  }
  const proxy = Object.freeze({ ...resources.proxy });
  if (
    typeof proxy.httpProxy !== "string" ||
    typeof proxy.httpsProxy !== "string" ||
    typeof proxy.noProxy !== "string"
  ) {
    throw new IntegrationBindingError("trusted-material");
  }

  const assertCurrentAsync = async (context: IntegrationExecutionContext) => {
    lifetime.assertOpen();
    context.signal.throwIfAborted();
    await resources.assertCurrentAsync(context);
    context.signal.throwIfAborted();
  };

  const transport: IntegrationTransportResources = {
    runAsync: (context, operation) =>
      lifetime.trackAsync(async () => {
        await assertCurrentAsync(context);
        const result = await operation();
        await assertCurrentAsync(context);
        return result;
      }),
    acquireTestingAsync: (integration, context) =>
      lifetime.trackAsync(async () => {
        await assertCurrentAsync(context);
        const signal = AbortSignal.any([context.signal, lifetime.signal]);
        const scoped = { ...context, signal };
        const material = await requireIntegrationProducer(resources.trust, "trusted-material").readTrustMaterialAsync(
          signal,
        );
        if (material.version !== context.trustIdentity) throw new IntegrationBindingError("stale", integration.kind);
        await assertCurrentAsync(scoped);
        const trustedHostnames = material.trustedHostnames.map((entry) => Object.freeze({ ...entry }));
        const ca = [...material.ca];
        const identityCheck: typeof checkServerIdentity = (hostname, certificate) => {
          if (
            trustedHostnames.some(
              (entry) => entry.hostname === hostname && entry.thumbprint === certificate.fingerprint256,
            )
          ) {
            return undefined;
          }
          return checkServerIdentity(hostname, certificate);
        };
        const tls = {
          ca,
          secureContext: createSecureContext({ ca }),
          checkServerIdentity: identityCheck,
          ...(resources.lookup ? { lookup: resources.lookup } : {}),
        };
        const dispatcher = new EnvHttpProxyAgent({ ...proxy, connect: tls, requestTls: tls, proxyTls: tls });
        const proxyEnv = {
          NODE_ENV: nodeEnvironmentMode,
          HTTP_PROXY: "",
          HTTPS_PROXY: "",
          NO_PROXY: "*",
          http_proxy: "",
          https_proxy: "",
          no_proxy: "*",
        };
        const httpAgent = new HttpAgent({ keepAlive: true, proxyEnv });
        const httpsAgent = new HttpsAgent({ ...tls, keepAlive: true, proxyEnv });
        const ownedHttpAgent = ownIntegrationNodeAgent(httpAgent);
        const ownedHttpsAgent = ownIntegrationNodeAgent(httpsAgent);
        let released = false;
        const physical = new Set<Promise<unknown>>();
        const destruction: Promise<void>[] = [];
        let destroyed: Promise<void> | undefined;
        const trackAsync = <T>(work: Promise<T>) => {
          physical.add(work);
          void work.then(
            () => physical.delete(work),
            () => physical.delete(work),
          );
          return work;
        };
        const destroyNodeAgentsAsync = () => {
          return Promise.all([ownedHttpAgent.retireAsync(), ownedHttpsAgent.retireAsync()]).then(() => undefined);
        };
        const destroy = () => {
          if (destroyed) return;
          destroyed = Promise.all([destroyNodeAgentsAsync(), dispatcher.destroy()]).then(() => undefined);
          destruction.push(destroyed);
          void destroyed.catch(() => {});
        };
        signal.addEventListener("abort", destroy, { once: true });
        const releaseAsync = lifetime.own(async () => {
          released = true;
          signal.removeEventListener("abort", destroy);
          const nodeRetirement = destroyNodeAgentsAsync();
          destruction.push(nodeRetirement);
          void nodeRetirement.catch(() => {});
          let timer: ReturnType<typeof setTimeout> | undefined;
          const failures: unknown[] = [];
          try {
            if (signal.aborted) destroy();
            else {
              timer = setTimeout(destroy, resources.retirementGraceMs);
              timer.unref?.();
            }
            try {
              if (destroyed) await destroyed;
              else await dispatcher.close();
            } catch (error) {
              failures.push(error);
              destroy();
            }
            while (physical.size) await Promise.allSettled([...physical]);
            const outcomes = await Promise.allSettled(destruction);
            failures.push(...outcomes.flatMap((result) => (result.status === "rejected" ? [result.reason] : [])));
            if (failures.length) throw new AggregateError(failures, "Integration transport retirement failed");
          } finally {
            if (timer) clearTimeout(timer);
          }
        });
        const assertUsableAsync = async () => {
          if (released) throw new IntegrationBindingError("closed");
          await assertCurrentAsync(scoped);
          const current = await requireIntegrationProducer(resources.trust, "trusted-material").readTrustMaterialAsync(
            signal,
          );
          if (current.version !== material.version) throw new IntegrationBindingError("stale", integration.kind);
          signal.throwIfAborted();
        };

        try {
          const axiosHttpAdapter = getAdapter("http");
          const adapter: ReturnType<typeof getAdapter> = (config) => trackAsync(axiosHttpAdapter(config));
          const axiosInstance = createAxios({ httpAgent, httpsAgent, proxy: false, adapter });
          axiosInstance.interceptors.request.use(async (config) => {
            await assertUsableAsync();
            if ((proxy.httpProxy || proxy.httpsProxy) && proxy.noProxy !== "*") {
              throw new IntegrationBindingError("axios-proxy-resources", integration.kind);
            }
            config.httpAgent = httpAgent;
            config.httpsAgent = httpsAgent;
            config.proxy = false;
            config.adapter = adapter;
            if (config.signal && !(config.signal instanceof AbortSignal)) {
              throw new IntegrationBindingError("native-class-resources", integration.kind);
            }
            config.signal = config.signal ? AbortSignal.any([signal, config.signal]) : signal;
            return config;
          });
          const input: IntegrationTestingInput = {
            dispatcher,
            axiosInstance,
            options: { ca, checkServerIdentity: identityCheck },
            fetchAsync: async (url, init) => {
              await assertUsableAsync();
              const requestSignal = init?.signal ? AbortSignal.any([signal, init.signal]) : signal;
              try {
                return await trackAsync(undiciFetch(url, { ...init, signal: requestSignal, dispatcher }));
              } catch (error) {
                throw sanitizeIntegrationTransportError(error);
              }
            },
          };
          await assertUsableAsync();
          return { ownership: "owned", input, releaseAsync };
        } catch (error) {
          await releaseAsync();
          throw error;
        }
      }),
    testConnectionAsync: async (integration, context, operation) => {
      await assertCurrentAsync(context);
      const lease = await transport.acquireTestingAsync(integration, context);
      try {
        await assertCurrentAsync(context);
        return await new TestConnectionService(new URL(integration.url), {
          getTlsOptionsAsync: async () => lease.input.options,
          fetchCertificateAsync: async (url) => {
            await assertCurrentAsync(context);
            const certificate = await requireIntegrationProducer(
              resources.diagnostics,
              "certificate-diagnostics",
            ).fetchCertificateAsync(url, context);
            await assertCurrentAsync(context);
            return certificate;
          },
        }).handleAsync(() => operation(lease.input));
      } finally {
        if (lease.ownership === "owned") await lease.releaseAsync();
      }
    },
  };

  return transport;
};
