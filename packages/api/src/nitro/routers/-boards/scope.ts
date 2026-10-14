import { ORPCError } from "@orpc/server";
import { snapshotPolicyIdentity } from "@homarr/auth/nitro/policy";
import type { PolicyIdentity } from "@homarr/auth/nitro/policy";
import type { GroupPermissionKey } from "@homarr/definitions";

import type { BackendContext } from "../../context";
import type { BoardProcedureResources } from "./resources";

export interface BoardReadScope {
  readonly db: BackendContext["db"];
  readonly identity: PolicyIdentity;
  checkAsync(): Promise<void>;
  readAsync<T>(operation: () => PromiseLike<T>): Promise<T>;
}

export function requireBoardPrincipal(scope: BoardReadScope, permission?: GroupPermissionKey) {
  if (scope.identity.type !== "authenticated") throw new ORPCError("UNAUTHORIZED");
  if (permission && !scope.identity.permissions.includes(permission))
    throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
}

export async function withBoardReadAsync<T>(
  resources: Pick<BoardProcedureResources, "acquireReadAsync">,
  context: BackendContext,
  operation: (scope: BoardReadScope) => Promise<T>,
): Promise<T> {
  context.signal.throwIfAborted();
  const lease = await resources.acquireReadAsync(context);
  const pending = new Set<Promise<unknown>>();
  try {
    async function checkAsync() {
      context.signal.throwIfAborted();
      await lease.assertCurrentAsync();
      context.signal.throwIfAborted();
    }
    await checkAsync();
    if (
      lease.principal.kind !== context.principal.kind ||
      (lease.principal.kind === "authenticated" &&
        (context.principal.kind !== "authenticated" || lease.principal.user.id !== context.principal.user.id))
    )
      throw new ORPCError("UNAUTHORIZED");
    const identity = snapshotPolicyIdentity(
      lease.principal.kind === "anonymous"
        ? { type: "anonymous" }
        : {
            type: "authenticated",
            userId: lease.principal.user.id,
            permissions: lease.principal.user.permissions,
            groupIds: [],
          },
    );
    function readAsync<TResult>(query: () => PromiseLike<TResult>): Promise<TResult> {
      const task = (async () => {
        await checkAsync();
        const result = await query();
        await checkAsync();
        return result;
      })();
      pending.add(task);
      void task.then(
        () => pending.delete(task),
        () => pending.delete(task),
      );
      return task;
    }
    const result = await operation({ db: lease.db, identity, checkAsync, readAsync });
    await checkAsync();
    return result;
  } finally {
    await Promise.allSettled(pending);
    await lease.releaseAsync();
    context.signal.throwIfAborted();
  }
}
