import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import type { RuntimeContribution } from "../contracts/contribution";
import type { RenderAssets } from "../contracts/render";
import type { RequestContext } from "../contracts/request";
import { createApplication } from "./application";
import { renderPublicPage } from "./render";

const publicProcedure = os.$context<RequestContext>();

export const foundationRpc = {
  health: publicProcedure.handler(() => ({ status: "ready" as const, scope: "public-foundation" as const })),
};

const rpcHandler = new RPCHandler(foundationRpc);

const contributions: readonly RuntimeContribution[] = [
  {
    id: "foundation",
    routes: [
      {
        phase: "api",
        path: "/api/health",
        access: { kind: "public" },
        async handle() {
          return { kind: "response", response: Response.json({ status: "ready", scope: "public-foundation" }) };
        },
      },
      {
        phase: "rpc",
        path: "/rpc",
        descendants: true,
        access: { kind: "public" },
        async handle(context) {
          const result = await rpcHandler.handle(context.request, { prefix: "/rpc", context });
          return result.matched ? { kind: "response", response: result.response } : { kind: "pass" };
        },
      },
    ],
  },
];

export function composeApplication(assets: RenderAssets) {
  return createApplication({ contributions, render: (context) => renderPublicPage(context, assets) });
}
