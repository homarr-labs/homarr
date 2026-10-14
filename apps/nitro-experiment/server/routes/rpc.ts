import { RPCHandler } from "@orpc/server/fetch";
import { defineHandler } from "nitro";

import { apiRouter } from "../../src/server/api/root";
import { errorStatusMap, runFixtureRequest } from "../../src/server/context/http";

const handler = new RPCHandler(apiRouter, { errorStatusMap });

export default defineHandler((event) =>
  runFixtureRequest(event.req, async (context) => {
    const result = await handler.handle(event.req, { prefix: "/rpc", context });
    return result.matched ? result.response : Response.json({ code: "NOT_FOUND" }, { status: 404 });
  }),
);
