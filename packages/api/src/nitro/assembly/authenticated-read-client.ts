import type { RouterClient } from "@orpc/server";

import type { createAuthenticatedReadAssembly } from "./authenticated-read";

export type AuthenticatedReadAssemblyClient = RouterClient<
  ReturnType<typeof createAuthenticatedReadAssembly>["router"]
>;
