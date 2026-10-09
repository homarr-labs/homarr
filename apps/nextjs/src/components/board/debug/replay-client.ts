import { QueryClient, hashKey } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";

import type { AppRouter } from "@homarr/api";

import type { BoardSnapshotPayload } from "./snapshot";

const replayError = (message: string, code = "INTERNAL_SERVER_ERROR") =>
  new TRPCClientError(message, {
    result: { error: { message, code: -32603, data: { code } } },
  });

export const createReplayQueryClient = (payload: BoardSnapshotPayload) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
        retryOnMount: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
      },
      mutations: { retry: false },
    },
  });
  for (const query of payload.queries) {
    client.setQueryDefaults(query.key, { meta: { boardSnapshotCaptured: true } });
    const cached = client.getQueryCache().build(client, { queryKey: query.key, meta: { boardSnapshotCaptured: true } });
    cached.setState({
      data: query.data,
      status: query.status,
      fetchStatus: "idle",
      dataUpdatedAt: query.updatedAt,
      error: query.status === "error" ? replayError("Captured widget error", query.errorCode) : null,
    });
  }
  return client;
};

export const snapshotReplayLink =
  (payload: BoardSnapshotPayload): TRPCLink<AppRouter> =>
  () =>
  ({ op }) =>
    observable((observer) => {
      if (op.type === "mutation") {
        observer.error(replayError("Actions are disabled in the board playground", "FORBIDDEN"));
        return;
      }
      if (op.type === "subscription") return;
      const match = payload.queries.find((query) => {
        const [path, options] = query.key;
        if (!Array.isArray(path) || path.join(".") !== op.path) return false;
        if (!options || typeof options !== "object") return op.input === undefined;
        return hashKey([(options as { input?: unknown }).input]) === hashKey([op.input]);
      });
      if (!match) {
        observer.error(replayError("This query was not captured in the snapshot", "NOT_FOUND"));
        return;
      }
      if (match.status === "pending") return;
      if (match.status === "error") {
        observer.error(replayError("Captured widget error", match.errorCode));
        return;
      }
      observer.next({ result: { type: "data", data: match.data } });
      observer.complete();
    });
