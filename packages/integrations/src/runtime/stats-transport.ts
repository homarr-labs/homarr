import { Headers } from "undici";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import type { IntegrationHttpAuthentication } from "../http-auth";
import type { StatsFetchContext, StatsProvider } from "../stats/types";
import { IntegrationTransportStatusError, sanitizeIntegrationTransportError } from "./transport-errors";

export { IntegrationTransportStatusError } from "./transport-errors";

export const createStatsFetchContext = (
  input: IntegrationInput,
  signal: AbortSignal,
  transport: Pick<IntegrationTestingInput, "fetchAsync"> & Partial<Pick<IntegrationTestingInput, "axiosInstance">>,
  options?: { authentication?: IntegrationHttpAuthentication; transport?: StatsProvider["transport"] },
): StatsFetchContext => {
  const url = (path: `/${string}`) => new URL(`${input.url.replace(/\/+$/, "")}${path}`);
  return {
    url: new URL(input.url),
    signal,
    secret: (kind) => {
      signal.throwIfAborted();
      const secret = input.decryptedSecrets.find((entry) => entry.kind === kind);
      if (!secret) throw new Error("Integration credential is missing");
      return secret.value;
    },
    hasSecret: (kind) => input.decryptedSecrets.some((entry) => entry.kind === kind),
    async requestAsync(path, init) {
      signal.throwIfAborted();
      const requestSignal = init?.signal ? AbortSignal.any([signal, init.signal]) : signal;
      const target = url(path);
      for (const [name, value] of Object.entries(options?.authentication?.query ?? {}))
        target.searchParams.set(name, value);
      const headers = new Headers(init?.headers);
      for (const [name, value] of Object.entries(options?.authentication?.headers ?? {})) headers.set(name, value);
      try {
        if (options?.transport === "axios") {
          if (!transport.axiosInstance) throw new Error("Axios transport is required");
          const response = await transport.axiosInstance.request<unknown>({
            url: target.toString(),
            method: init?.method ?? "GET",
            headers: Object.fromEntries(headers),
            data: init?.body,
            signal: requestSignal,
            maxRedirects: 0,
          });
          requestSignal.throwIfAborted();
          return response.data;
        }
        const response = await transport.fetchAsync(target, {
          ...init,
          headers,
          signal: requestSignal,
          redirect: "error",
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw new IntegrationTransportStatusError(response.status);
        }
        const data: unknown = await response.json();
        requestSignal.throwIfAborted();
        return data;
      } catch (error) {
        throw sanitizeIntegrationTransportError(error);
      }
    },
    async requestResponseAsync(path, init) {
      signal.throwIfAborted();
      const requestSignal = init?.signal ? AbortSignal.any([signal, init.signal]) : signal;
      try {
        const response = await transport.fetchAsync(url(path), { ...init, signal: requestSignal, redirect: "error" });
        await response.body?.cancel();
        let headerBytes = 0;
        for (const [name, value] of response.headers) {
          headerBytes += Buffer.byteLength(name) + Buffer.byteLength(value);
          if (headerBytes > 16_384) throw new Error("Response headers are too large");
        }
        requestSignal.throwIfAborted();
        return { status: response.status, headers: response.headers };
      } catch (error) {
        throw sanitizeIntegrationTransportError(error);
      }
    },
  };
};
