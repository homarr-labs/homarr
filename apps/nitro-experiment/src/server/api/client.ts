import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterContractClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { rpcContract } from "../../contracts/rpc";

export type FixtureClient = RouterContractClient<typeof rpcContract>;

export function createBrowserClient(): FixtureClient {
  return createORPCClient(
    new RPCLink({
      url: "/rpc",
      fetch: (url, init) => fetch(url, { ...init, credentials: "same-origin" }),
    }),
  );
}

export function createFixtureQueryUtils(client: FixtureClient) {
  return createTanstackQueryUtils(client);
}
