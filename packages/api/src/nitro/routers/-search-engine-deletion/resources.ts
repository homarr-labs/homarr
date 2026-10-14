import type { Database, eq, HomarrDatabasePostgresql } from "@homarr/db";
import type { PostgreSqlSchema, SqliteSchema } from "@homarr/db/schema";

import type { BackendContext } from "../../context";

export type SearchEngineDeletionNativeDatabase =
  | {
      readonly kind: "sqlite";
      readonly db: Database;
      readonly schema: Pick<SqliteSchema, "users" | "searchEngines">;
    }
  | {
      readonly kind: "postgresql";
      readonly db: HomarrDatabasePostgresql;
      readonly schema: Pick<PostgreSqlSchema, "users" | "searchEngines">;
    };

export interface SearchEngineDeletionResources {
  readonly operators: { readonly eq: typeof eq };
  nativeDatabase(db: BackendContext["db"]): SearchEngineDeletionNativeDatabase;
}
