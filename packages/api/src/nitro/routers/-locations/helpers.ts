import { withTimeoutAsync } from "@homarr/core/infrastructure/http/timeout";

import type { BackendContext } from "../../context";
import type { LocationProcedureResources } from "./resources";

export async function fetchLocationResponseAsync(
  resources: LocationProcedureResources,
  context: BackendContext,
  url: string,
  procedureSignal?: AbortSignal,
) {
  const ownership = new AbortController();
  context.onDispose(() => ownership.abort());
  const requestSignal = AbortSignal.any([
    context.signal,
    ownership.signal,
    ...(procedureSignal ? [procedureSignal] : []),
  ]);
  requestSignal.throwIfAborted();

  return await withTimeoutAsync(async (timeoutSignal) => {
    const signal = AbortSignal.any([requestSignal, timeoutSignal]);
    signal.throwIfAborted();
    return await resources.fetchWithTrustedCertificatesAsync(url, { signal });
  });
}
