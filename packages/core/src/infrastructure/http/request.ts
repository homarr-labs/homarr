import type { AgentOptions } from "node:https";
import { Agent as HttpsAgent } from "node:https";
import type { LookupFunction } from "node:net";
import type { checkServerIdentity } from "node:tls";
import { create as createAxios } from "axios";
import type { EnvHttpProxyAgent as UndiciEnvHttpProxyAgent, RequestInfo, RequestInit, Response } from "undici";
import { fetch } from "undici/index.js";

import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { UndiciHttpAgent } from "@homarr/core/infrastructure/http";

import { getHttpRequestSignal } from "./request-signal";
import { withTimeoutAsync } from "./timeout";
import { createCustomCheckServerIdentity, createTlsContextCache } from "./tls";

const { getTlsContext } = createTlsContextCache();

export { createCustomCheckServerIdentity } from "./tls";

export const createCertificateAgentAsync = async (
  override?: Partial<{
    ca: string | string[];
    checkServerIdentity: typeof checkServerIdentity;
    lookup: LookupFunction;
  }>,
  agentOptions?: Pick<
    UndiciEnvHttpProxyAgent.Options,
    "autoSelectFamily" | "bodyTimeout" | "httpProxy" | "httpsProxy" | "noProxy"
  >,
) => {
  const ca = override?.ca ?? (await getAllTrustedCertificatesAsync());
  const identityCheck =
    override?.checkServerIdentity ?? createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync());
  return new UndiciHttpAgent({
    ...agentOptions,
    connect: {
      ca,
      secureContext: getTlsContext(ca),
      checkServerIdentity: identityCheck,
      ...(override?.lookup ? { lookup: override.lookup } : {}),
    },
  });
};

export const createHttpsAgentAsync = async (override?: Pick<AgentOptions, "ca" | "checkServerIdentity">) => {
  const ca = override?.ca ?? (await getAllTrustedCertificatesAsync());
  return new HttpsAgent({
    ca,
    secureContext: getTlsContext(ca),
    checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    // Override the ca and checkServerIdentity if provided
    ...override,
    proxyEnv: process.env,
  });
};

export const createAxiosCertificateInstanceAsync = async (
  override?: Pick<AgentOptions, "ca" | "checkServerIdentity">,
) => {
  const client = createAxios({
    httpsAgent: await createHttpsAgentAsync(override),
  });
  client.interceptors.request.use((config) => {
    const signal = getHttpRequestSignal(config.signal as AbortSignal | undefined);
    signal?.throwIfAborted();
    config.signal = signal;
    return config;
  });
  return client;
};

export const fetchWithTrustedCertificatesAsync = async (
  url: RequestInfo,
  options?: RequestInit & { timeout?: number; bodyTimeout?: number },
): Promise<Response> => {
  const requestSignal = getHttpRequestSignal(options?.signal);
  requestSignal?.throwIfAborted();
  const agent =
    options?.dispatcher ??
    (await createCertificateAgentAsync(
      undefined,
      options?.bodyTimeout !== undefined ? { bodyTimeout: options.bodyTimeout } : undefined,
    ));
  if (options?.timeout) {
    const { bodyTimeout: _bodyTimeout, dispatcher: _dispatcher, ...fetchOptions } = options;
    return await withTimeoutAsync(
      async (signal) =>
        fetch(url, {
          ...fetchOptions,
          signal: AbortSignal.any([signal, requestSignal ?? signal]),
          dispatcher: agent,
        }),
      options.timeout,
    );
  }

  const { bodyTimeout: _bodyTimeout, dispatcher: _dispatcher, ...fetchOptions } = options ?? {};
  return fetch(url, {
    ...fetchOptions,
    signal: requestSignal,
    dispatcher: agent,
  });
};
