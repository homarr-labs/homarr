import type { AgentOptions } from "node:https";
import { Agent as HttpsAgent } from "node:https";
import { checkServerIdentity } from "node:tls";
import axios from "axios";
import type { RequestInfo, RequestInit, Response } from "undici";
import { fetch } from "undici";

import { LoggingAgent } from "@homarr/common/server";
import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import type { InferSelectModel } from "@homarr/db";
import type { trustedCertificateHostnames } from "@homarr/db/schema";

export const createCustomCheckServerIdentity = (
  trustedHostnames: InferSelectModel<typeof trustedCertificateHostnames>[],
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

export const createCertificateAgentAsync = async (override?: {
  ca: string | string[];
  checkServerIdentity: typeof checkServerIdentity;
}) => {
  return new LoggingAgent({
    connect: override ?? {
      ca: await getAllTrustedCertificatesAsync(),
      checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    },
  });
};

export const createHttpsAgentAsync = async (override?: Pick<AgentOptions, "ca" | "checkServerIdentity">) => {
  return new HttpsAgent(
    override ?? {
      ca: await getAllTrustedCertificatesAsync(),
      checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    },
  );
};

export const createAxiosCertificateInstanceAsync = async (
  override?: Pick<AgentOptions, "ca" | "checkServerIdentity">,
) => {
  return axios.create({
    httpsAgent: await createHttpsAgentAsync(override),
  });
};

export const fetchWithTrustedCertificatesAsync = async (url: RequestInfo, options?: RequestInit): Promise<Response> => {
  const agent = await createCertificateAgentAsync(undefined);
  return fetch(url, {
    ...options,
    dispatcher: agent,
  });
};
