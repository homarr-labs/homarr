import type { AuthenticatedReadAssemblyClient } from "@homarr/api/nitro/assembly/authenticated-read-client";

import { createQueryScopeFamily } from "./scope-owner";
import type { QueryScope, QueryScopeOwner } from "./types";

export type AuthenticatedReadQueryScope = QueryScope<AuthenticatedReadAssemblyClient>;

export type AuthenticatedReadQueryScopeOwner = QueryScopeOwner<AuthenticatedReadAssemblyClient>;

export const createAuthenticatedReadQueryScopeOwner =
  createQueryScopeFamily<AuthenticatedReadAssemblyClient>("authenticated-read");
