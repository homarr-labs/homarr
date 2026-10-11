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
        meta: {
          boardSnapshotPendingQueryHashes: new Set(
            payload.queries.filter((query) => query.status === "pending").map((query) => hashKey(query.key)),
          ),
        },
      },
      mutations: { retry: false },
    },
  });
  for (const query of payload.queries) {
    const cached = client.getQueryCache().build(client, { queryKey: query.key });
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

export const snapshotReplayLink = (payload: BoardSnapshotPayload): TRPCLink<AppRouter> => {
  const captured = new Map<string, BoardSnapshotPayload["queries"][number]>();
  for (const query of payload.queries) {
    const [path, options] = query.key;
    if (!Array.isArray(path)) continue;
    let input: unknown;
    if (options && typeof options === "object") input = (options as { input?: unknown }).input;
    const key = hashKey([path.join("."), input]);
    if (!captured.has(key)) captured.set(key, query);
  }
  return () =>
    ({ op }) =>
      observable((observer) => {
        if (op.type === "mutation") {
          observer.error(replayError("Actions are disabled in the board playground", "FORBIDDEN"));
          return;
        }
        if (op.type === "subscription") return;
        const match = captured.get(hashKey([op.path, op.input]));
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
};
