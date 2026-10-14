import type { RouterClient } from "@orpc/server";

import type { createExpansionApiAssembly } from "./index";

export type ExpansionApiAssemblyClient = RouterClient<ReturnType<typeof createExpansionApiAssembly>>;
