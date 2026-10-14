import type { createId } from "@homarr/common";
import type { and, asc, eq, inArray, like, or } from "@homarr/db";
import type { apps, icons, integrations, items, searchEngines, serverSettings, users } from "@homarr/db/schema";
import type { selectAppSchema } from "@homarr/db/validationSchemas";

import type { BackendContext } from "../../context";
import type { SourceLeafPath } from "../../port-map";

export interface AppProcedureResources {
  readonly tables: {
    readonly apps: typeof apps;
    readonly integrations: typeof integrations;
    readonly items: typeof items;
    readonly icons: typeof icons;
  };
  readonly operators: {
    readonly asc: typeof asc;
    readonly eq: typeof eq;
    readonly inArray: typeof inArray;
    readonly like: typeof like;
    readonly or: typeof or;
  };
  readonly selectAppSchema: typeof selectAppSchema;
  readonly createId: typeof createId;
  invalidateIntegrationResponseCacheAsync(integrationId: string): Promise<void>;
}

export interface SearchEngineProcedureResources {
  readonly tables: {
    readonly searchEngines: typeof searchEngines;
    readonly users: typeof users;
    readonly serverSettings: typeof serverSettings;
  };
  readonly operators: {
    readonly and: typeof and;
    readonly asc: typeof asc;
    readonly eq: typeof eq;
    readonly like: typeof like;
  };
  readonly createId: typeof createId;
  warn(error: Error): void;
}

export type AppsSearchSourceBinding = {
  readonly path: SourceLeafPath;
  readonly sourceFile: string;
} & ({ readonly status: "native" } | { readonly status: "pending"; readonly reason: string });

export async function runActiveRequest<T>(context: BackendContext, operation: () => T | PromiseLike<T>): Promise<T> {
  context.signal.throwIfAborted();
  const result = await operation();
  context.signal.throwIfAborted();
  return result;
}
