import { createORPCClient } from "@orpc/client";

import type { ExpansionApiAssemblyClient } from "@homarr/api/nitro/assembly/client";

import { createBrowserRpcLink } from "./rpc-link";

export function createExpansionBrowserClient(endpoint: string | URL): ExpansionApiAssemblyClient {
  return createORPCClient<ExpansionApiAssemblyClient>(createBrowserRpcLink(endpoint));
}
