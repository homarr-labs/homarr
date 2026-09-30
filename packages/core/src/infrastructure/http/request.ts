import type { AgentOptions } from "node:https";
import { Agent as HttpsAgent } from "node:https";
import type { LookupFunction } from "node:net";
import { checkServerIdentity } from "node:tls";
import axios from "axios";
import type { EnvHttpProxyAgent as UndiciEnvHttpProxyAgent, RequestInfo, RequestInit, Response } from "undici";
import { fetch } from "undici";

import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
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
      checkServerIdentity: identityCheck,
      ...(override?.lookup ? { lookup: override.lookup } : {}),
    },
  });
};

export const createHttpsAgentAsync = async (override?: Pick<AgentOptions, "ca" | "checkServerIdentity">) => {
  return new HttpsAgent({
    ca: await getAllTrustedCertificatesAsync(),
    checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    // Override the ca and checkServerIdentity if provided
    ...override,
    proxyEnv: process.env,
  });
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
