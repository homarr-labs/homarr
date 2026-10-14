import { createHash } from "node:crypto";
import type { AgentOptions } from "node:https";
import { checkServerIdentity, createSecureContext } from "node:tls";
import type { SecureContext } from "node:tls";

import type { TrustedCertificateHostname } from "../certificates/hostnames/types";

export const createTlsContextCache = () => {
  const contexts = new Map<string, SecureContext>();
  const getTlsContext = (ca: NonNullable<AgentOptions["ca"]>) => {
    const hash = createHash("sha256");
    for (const certificate of Array.isArray(ca) ? ca : [ca]) {
      hash
        .update(String(Buffer.byteLength(certificate)))
        .update(":")
        .update(certificate);
    }
    const identity = hash.digest("hex");
    const existing = contexts.get(identity);
    if (existing) return existing;
    const context = createSecureContext({ ca });
    if (contexts.size >= 4) {
      const oldest = contexts.keys().next().value;
      if (oldest !== undefined) contexts.delete(oldest);
    }
    contexts.set(identity, context);
    return context;
  };

  return { getTlsContext, clear: () => contexts.clear() };
};

export const createCustomCheckServerIdentity = (
  trustedHostnames: TrustedCertificateHostname[],
): typeof checkServerIdentity => {
  return (hostname, peerCertificate) => {
    const matchingTrustedHostnames = trustedHostnames.filter(
      (certificate) => certificate.thumbprint === peerCertificate.fingerprint256,
    );
    if (matchingTrustedHostnames.some((certificate) => certificate.hostname === hostname)) return undefined;
    return checkServerIdentity(hostname, peerCertificate);
  };
};
