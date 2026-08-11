import { createHash } from "node:crypto";
import type { AgentOptions } from "node:https";
import { Agent as HttpsAgent } from "node:https";
import { checkServerIdentity, rootCertificates } from "node:tls";
import axios from "axios";
import type { Agent as UndiciAgent, RequestInfo, RequestInit, Response } from "undici";
import { fetch } from "undici";

import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
  loadCustomRootCertificatesAsync,
} from "@homarr/core/infrastructure/certificates";
import { UndiciHttpAgent } from "@homarr/core/infrastructure/http";

import type { TrustedCertificateHostname } from "../certificates/hostnames";
import { withTimeoutAsync } from "./timeout";

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

/**
 * An agent owns its connection pool and its TLS session cache, so building a new one per request
 * makes every request pay a full handshake. These caches hold one agent per configuration and are
 * discarded whenever the trust material changes.
 *
 * The trust material itself is still read on every call, so adding or removing a certificate - by any
 * means, including dropping a file into the mounted folder - takes effect on the very next request,
 * exactly as it did before.
 */
const undiciAgentCache = new Map<string, UndiciHttpAgent>();
const httpsAgentCache = new Map<string, HttpsAgent>();
let cachedTrustFingerprint: string | null = null;

/**
 * Reads the current trust material and invalidates the agent caches if it changed.
 * Node's root store is a constant, so only the custom certificates and trusted hostnames are
 * hashed - on a default install that is nothing at all.
 */
const getTrustMaterialAsync = async () => {
  const [customCertificates, hostnames] = await Promise.all([
    loadCustomRootCertificatesAsync(),
    getTrustedCertificateHostnamesAsync(),
  ]);

  const fingerprint = createHash("sha1")
    .update(
      JSON.stringify([
        customCertificates.map((certificate) => [certificate.fileName, certificate.content]),
        hostnames.map((hostname) => [hostname.hostname, hostname.thumbprint]),
      ]),
    )
    .digest("hex");

  if (fingerprint !== cachedTrustFingerprint) {
    // Superseded agents hold their idle sockets open until they are closed.
    for (const agent of undiciAgentCache.values()) void agent.close();
    for (const agent of httpsAgentCache.values()) agent.destroy();
    undiciAgentCache.clear();
    httpsAgentCache.clear();
    cachedTrustFingerprint = fingerprint;
  }

  return {
    hostnames,
    getCertificates: () => rootCertificates.concat(customCertificates.map((certificate) => certificate.content)),
  };
};

export const createCertificateAgentAsync = async (
  override?: {
    ca: string | string[];
    checkServerIdentity: typeof checkServerIdentity;
  },
  agentOptions?: Pick<UndiciAgent.Options, "bodyTimeout">,
) => {
  // A caller bringing its own trust material gets its own agent rather than polluting the cache.
  if (override) {
    return new UndiciHttpAgent({ ...agentOptions, connect: override });
  }

  const trust = await getTrustMaterialAsync();
  const cacheKey = `bodyTimeout:${agentOptions?.bodyTimeout ?? "default"}`;
  const cached = undiciAgentCache.get(cacheKey);
  if (cached) return cached;

  const agent = new UndiciHttpAgent({
    ...agentOptions,
    connect: {
      ca: trust.getCertificates(),
      checkServerIdentity: createCustomCheckServerIdentity(trust.hostnames),
    },
  });
  undiciAgentCache.set(cacheKey, agent);
  return agent;
};

export const createHttpsAgentAsync = async (override?: Pick<AgentOptions, "ca" | "checkServerIdentity">) => {
  if (override) {
    return new HttpsAgent({
      ca: await getAllTrustedCertificatesAsync(),
      checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
      // Override the ca and checkServerIdentity if provided
      ...override,
      proxyEnv: process.env,
    });
  }

  const trust = await getTrustMaterialAsync();
  const cached = httpsAgentCache.get("default");
  if (cached) return cached;

  const agent = new HttpsAgent({
    ca: trust.getCertificates(),
    checkServerIdentity: createCustomCheckServerIdentity(trust.hostnames),
    proxyEnv: process.env,
  });
  httpsAgentCache.set("default", agent);
  return agent;
};

export const createAxiosCertificateInstanceAsync = async (
  override?: Pick<AgentOptions, "ca" | "checkServerIdentity">,
) => {
  return axios.create({
    httpsAgent: await createHttpsAgentAsync(override),
  });
};

export const fetchWithTrustedCertificatesAsync = async (
  url: RequestInfo,
  options?: RequestInit & { timeout?: number; bodyTimeout?: number },
): Promise<Response> => {
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
          signal,
          dispatcher: agent,
        }),
      options.timeout,
    );
  }

  const { bodyTimeout: _bodyTimeout, dispatcher: _dispatcher, ...fetchOptions } = options ?? {};
  return fetch(url, {
    ...fetchOptions,
    dispatcher: agent,
  });
};
