import { cache } from "react";
import { RPCLink } from "@orpc/client/fetch";
import type { FetchQueryOptions, QueryFunctionContext } from "@tanstack/react-query";

import type { ORPCClient } from "./orpc";
import { createNativeApiClient, getNativeClient } from "./native-client";
import { createRscRequestHeadersAsync } from "./rsc-context";
import { getRpcUrl, makeQueryClient } from "./shared";

// RSC requests share the native authenticated HTTP boundary with the browser.
export const api = createNativeApiClient({
  link: new RPCLink({
    url: "/rpc",
    origin: new URL(getRpcUrl()).origin,
    headers: createRscRequestHeadersAsync,
    fetch: (request, init) => fetch(request, { ...init, cache: "no-store" }),
  }),
});

export const getQueryClient = cache(makeQueryClient);

type QueryOptionsRouter<T> = {
  [K in keyof T]: T[K] extends (input: infer I, ...args: never[]) => Promise<infer O>
    ? { queryOptions: (...args: undefined extends I ? [input?: I] : [input: I]) => FetchQueryOptions<O> }
    : QueryOptionsRouter<T[K]>;
};

const native = getNativeClient(api);

function queryOptionsRouter(path: string[] = []): unknown {
  return new Proxy(() => undefined, {
    get(_target, property) {
      if (property === "queryOptions") {
        return (input?: unknown) => ({
          queryKey: [path, { input, type: "query" }],
          queryFn: ({ signal }: QueryFunctionContext) => {
            return native.query(path.join("."), input, { signal });
          },
        });
      }
      if (typeof property === "string" && property !== "then") return queryOptionsRouter([...path, property]);
      return undefined;
    },
  });
}

export const rpc = queryOptionsRouter() as QueryOptionsRouter<ORPCClient>;
export const getBackendRuntimeAsync = cache(async () => await api.frontend.runtime.query());
