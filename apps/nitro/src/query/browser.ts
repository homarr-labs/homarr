import type { QueryClient } from "@tanstack/react-query";

import { createExpansionBrowserClient } from "../client/expansion";
import { createExpansionQueryScopeOwner } from "./scope";
import type { ExpansionQueryCacheIdentity, ExpansionQueryScope } from "./types";

export interface ExpansionBrowserQueryBindingOptions {
  readonly endpoint: string | URL;
  readonly queryClient: QueryClient;
}

export function createExpansionBrowserQueryBinding(options: ExpansionBrowserQueryBindingOptions) {
  const client = createExpansionBrowserClient(options.endpoint);
  const owner = createExpansionQueryScopeOwner(options.queryClient, "browser");
  let current: ExpansionQueryScope | undefined;
  let transition = Promise.resolve();
  let disposed = false;
  let disposal: Promise<void> | undefined;

  return Object.freeze({
    client,
    queryClient: options.queryClient,
    get scope() {
      return current;
    },
    activate(identity: ExpansionQueryCacheIdentity): Promise<ExpansionQueryScope> {
      const capturedIdentity = Object.freeze({
        cacheLifetimeId: identity.cacheLifetimeId,
        clientCacheId: identity.clientCacheId,
        principalCacheId: identity.principalCacheId,
        permissionRevision: identity.permissionRevision,
        boardCacheId: identity.boardCacheId,
        boardRevision: identity.boardRevision,
      });
      const activation = transition.then(async () => {
        if (disposed) throw new Error("Browser Query binding is disposed");
        if (current && JSON.stringify(current.identity) === JSON.stringify(capturedIdentity)) {
          current.assertCurrent();
          return current;
        }
        if (current) await current.retire();
        current = undefined;
        if (disposed) throw new Error("Browser Query binding is disposed");
        const next = owner.acquire(client, capturedIdentity);
        next.assertCurrent();
        current = next;
        return next;
      });
      transition = activation.then(
        () => undefined,
        () => undefined,
      );
      return activation;
    },
    dispose(): Promise<void> {
      disposed = true;
      disposal ??= transition.then(async () => {
        await current?.retire();
        current = undefined;
      });
      return disposal;
    },
  });
}

export type ExpansionBrowserQueryBinding = ReturnType<typeof createExpansionBrowserQueryBinding>;
