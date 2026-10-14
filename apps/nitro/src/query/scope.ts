import type { ExpansionApiAssemblyClient } from "@homarr/api/nitro/assembly/client";

import { createQueryScopeFamily } from "./scope-owner";

export const createExpansionQueryScopeOwner = createQueryScopeFamily<ExpansionApiAssemblyClient>("expansion");
