import { createORPCClient } from "@orpc/client";

import type { AuthenticatedReadAssemblyClient } from "@homarr/api/nitro/assembly/authenticated-read-client";

import { createBrowserRpcLink } from "./rpc-link";

export function createAuthenticatedReadBrowserClient(endpoint: string | URL): AuthenticatedReadAssemblyClient {
  return createORPCClient<AuthenticatedReadAssemblyClient>(createBrowserRpcLink(endpoint));
}
