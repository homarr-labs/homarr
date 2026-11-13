import { createHash } from "node:crypto";
import { EnvHttpProxyAgent } from "undici";

import { getAllTrustedCertificatesAsync } from "@homarr/core/infrastructure/certificates";

import type { FrameleafFetch } from "./connection";

let transport: { identity: string; agent: EnvHttpProxyAgent } | undefined;
/** Reuse Homarr's trusted CAs, retaining hostname verification and rejecting every untrusted certificate. */
export const frameleafFetch: FrameleafFetch = async (url, init) => {
  const ca = await getAllTrustedCertificatesAsync();
  const identity = createHash("sha256").update(ca.join("\n")).digest("hex");
  if (!transport || transport.identity !== identity) {
    const previous = transport;
    transport = {
      identity,
      agent: new EnvHttpProxyAgent({
        connect: { ca, rejectUnauthorized: true },
        requestTls: { ca, rejectUnauthorized: true },
        proxyTls: { ca, rejectUnauthorized: true },
        headersTimeout: 35000,
        bodyTimeout: 10000,
      }),
    };
    void previous?.agent.close().catch(() => undefined);
  }
  const options: RequestInit & { dispatcher: EnvHttpProxyAgent } = { ...init, dispatcher: transport.agent };
  return fetch(url, options);
};
