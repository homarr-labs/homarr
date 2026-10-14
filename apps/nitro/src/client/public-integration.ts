import { createORPCClient } from "@orpc/client";

import type { ExpansionApiAssemblyClient } from "@homarr/api/nitro/assembly/client";

import { createBrowserRpcLink } from "./rpc-link";

export function createPublicIntegrationBrowserClient(endpoint: string | URL) {
  return createORPCClient<{
    integration: { getKinds: ExpansionApiAssemblyClient["integration"]["getKinds"] };
  }>(createBrowserRpcLink(endpoint));
}

export type PublicIntegrationCatalogClient = ReturnType<typeof createPublicIntegrationBrowserClient>;
