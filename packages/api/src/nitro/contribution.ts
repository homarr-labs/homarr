import type { AnyRouter, InferRouterInitialContext, RouterClient } from "@orpc/server";
import { createRouterClient, walkProcedureContractsSync } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import type { BackendContext, BackendRequestResources } from "./context";
import type { SourceLeafPath } from "./port-map";
import { getSourceProcedureMeta } from "./procedure";

export interface BackendContribution<TRouter extends AnyRouter> {
  readonly revision: "homarr.backend.source-port.v2";
  readonly id: string;
  readonly router: TRouter;
  readonly leaves: readonly SourceLeafPath[];
}

export function defineBackendContribution<TRouter extends AnyRouter>(
  contribution: BackendContribution<TRouter>,
): BackendContribution<TRouter> {
  const registered = new Set<SourceLeafPath>();
  const lazy = walkProcedureContractsSync(contribution.router, (procedure, path) => {
    const descriptor = getSourceProcedureMeta(procedure);
    if (!descriptor || registered.has(descriptor.path))
      throw new Error("Invalid or duplicate source procedure contribution");
    if (path.join(".") !== descriptor.path)
      throw new Error("Source procedure route does not match its declared identity");
    registered.add(descriptor.path);
  });
  if (lazy.length > 0) throw new Error("Source procedure contributions must be explicit local routers");
  if (
    new Set(contribution.leaves).size !== contribution.leaves.length ||
    registered.size !== contribution.leaves.length ||
    contribution.leaves.some((path) => !registered.has(path))
  ) {
    throw new Error("Source procedure contribution does not match its declared leaves");
  }
  return contribution;
}

export function createBackendServerClient<TRouter extends AnyRouter>(
  contribution: BackendContribution<TRouter>,
  context: InferRouterInitialContext<TRouter>,
): RouterClient<TRouter> {
  return createRouterClient(contribution.router, { context });
}

export function createBackendFetchContribution<TRouter extends AnyRouter>(options: {
  readonly contribution: BackendContribution<TRouter>;
  readonly path: `/${string}`;
  resolveContext(request: BackendRequestResources): Promise<BackendContext & InferRouterInitialContext<TRouter>>;
}) {
  const handler = new RPCHandler(options.contribution.router, { allowMethods: ["POST"] });
  return {
    phase: "rpc" as const,
    path: options.path,
    descendants: true,
    access: { kind: "public" as const },
    async handle(request: BackendRequestResources) {
      if (request.request.method !== "POST") {
        return {
          kind: "response" as const,
          response: new Response(null, { status: 405, headers: { allow: "POST" } }),
        };
      }
      const result = await handler.handle(request.request, {
        prefix: options.path,
        context: await options.resolveContext(request),
      });
      return {
        kind: "response" as const,
        response: result.matched ? result.response : new Response(null, { status: 404 }),
      };
    },
  };
}
