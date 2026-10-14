import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { Client } from "@orpc/client";

export type CertificateRpcClient = {
  readonly certificates: {
    readonly addCertificate: Client<Record<never, never>, FormData, unknown, Error>;
    readonly removeCertificate: Client<Record<never, never>, { fileName: string }, unknown, Error>;
    readonly trustHostnameMismatch: Client<
      Record<never, never>,
      { hostname: string; certificate: string },
      unknown,
      Error
    >;
    readonly removeTrustedHostname: Client<
      Record<never, never>,
      { hostname: string; thumbprint: string },
      unknown,
      Error
    >;
  };
};

export function createCertificateRpcClient(url: URL): CertificateRpcClient {
  if (url.origin !== window.location.origin) throw new Error("Certificate RPC requires a same-origin endpoint");
  const path: `/${string}` = `/${url.pathname.slice(1)}${url.search}`;
  return createORPCClient<CertificateRpcClient>(
    new RPCLink({
      origin: url.origin,
      url: path,
      fetch: (request, init) => fetch(request, { ...init, credentials: "same-origin" }),
    }),
  );
}
