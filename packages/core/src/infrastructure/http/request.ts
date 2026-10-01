import { createHash } from "node:crypto";
import type { AgentOptions } from "node:https";
import { Agent as HttpsAgent } from "node:https";
import type { LookupFunction } from "node:net";
import { checkServerIdentity, createSecureContext } from "node:tls";
import type { SecureContext } from "node:tls";
import axios from "axios";
import type { EnvHttpProxyAgent as UndiciEnvHttpProxyAgent, RequestInfo, RequestInit, Response } from "undici";
import { fetch } from "undici";

import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { UndiciHttpAgent } from "@homarr/core/infrastructure/http";

import type { TrustedCertificateHostname } from "../certificates/hostnames";
import { getHttpRequestSignal } from "./request-signal";
import { withTimeoutAsync } from "./timeout";

// Parsing the entire CA store for every parallel connection adds synchronous
// work to the rendering thread. Reuse only the TLS context, never auth or data.
const tlsContexts = new Map<string, SecureContext>();
const getTlsContext = (ca: NonNullable<AgentOptions["ca"]>) => {
  const hash = createHash("sha256");
  for (const certificate of Array.isArray(ca) ? ca : [ca]) {
    hash
      .update(String(Buffer.byteLength(certificate)))
      .update(":")
      .update(certificate);
  }
  const identity = hash.digest("hex");
  const existing = tlsContexts.get(identity);
  if (existing) return existing;
  const context = createSecureContext({ ca });
  if (tlsContexts.size >= 4) {
    const oldest = tlsContexts.keys().next().value;
    if (oldest !== undefined) tlsContexts.delete(oldest);
  }
  tlsContexts.set(identity, context);
  return context;
};

export const createCustomCheckServerIdentity = (
  trustedHostnames: TrustedCertificateHostname[],
): typeof checkServerIdentity => {
  return (hostname, peerCertificate) => {
    const matchingTrustedHostnames = trustedHostnames.filter(
      (cert) => cert.thumbprint === peerCertificate.fingerprint256,
    );

    // We trust the certificate if we have a matching hostname
    if (matchingTrustedHostnames.some((cert) => cert.hostname === hostname)) return undefined;

    return checkServerIdentity(hostname, peerCertificate);
  };
};

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
  const client = axios.create({
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
