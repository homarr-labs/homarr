import type { Response } from "undici";

export interface LocationProcedureResources {
  readonly noExternalConnection: boolean;
  fetchWithTrustedCertificatesAsync(url: string, options: { readonly signal: AbortSignal }): Promise<Response>;
}
