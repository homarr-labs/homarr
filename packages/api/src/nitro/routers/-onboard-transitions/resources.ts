import type { isProviderEnabled } from "@homarr/auth/server";
import type { createId } from "@homarr/common";
import type { encryptSecret } from "@homarr/common/server";
import type { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database, eq, HomarrDatabasePostgresql, inArray } from "@homarr/db";
import type { getServerSettingByKeyAsync } from "@homarr/db/queries";
import type { PostgreSqlSchema, SqliteSchema } from "@homarr/db/schema";
import type { listDiscoveredContainersAsync } from "@homarr/docker";

import type { MissingSecretError, testConnectionAsync } from "../../../router/integration/integration-test-connection";

type OnboardSourceTable =
  | "apps"
  | "boards"
  | "groups"
  | "integrationItems"
  | "integrations"
  | "integrationSecrets"
  | "itemLayouts"
  | "items"
  | "layouts"
  | "onboarding"
  | "sectionLayouts"
  | "sections"
  | "serverSettings";

export type OnboardSqliteSchema = Pick<SqliteSchema, OnboardSourceTable>;
export type OnboardPostgresqlSchema = Pick<PostgreSqlSchema, OnboardSourceTable>;
export type OnboardSqliteTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type OnboardPostgresqlTransaction = Parameters<Parameters<HomarrDatabasePostgresql["transaction"]>[0]>[0];

export interface OnboardTransitionPreparationResources {
  readonly schema: OnboardSqliteSchema;
  readonly operators: { readonly eq: typeof eq; readonly inArray: typeof inArray };
  readonly createId: typeof createId;
  readonly encryptSecret: typeof encryptSecret;
  readonly isProviderEnabled: typeof isProviderEnabled;
  readonly testConnectionAsync: typeof testConnectionAsync;
  readonly MissingSecretError: typeof MissingSecretError;
  readonly listDiscoveredContainersAsync: typeof listDiscoveredContainersAsync;
  readonly getServerSettingByKeyAsync: typeof getServerSettingByKeyAsync;
  readonly logger: Pick<ReturnType<typeof createLogger>, "warn">;
}

export type OnboardSourceTransactionResources =
  | {
      readonly kind: "sqlite";
      readonly database: Pick<Database, "transaction">;
      readonly schema: OnboardSqliteSchema;
      readonly operators: { readonly eq: typeof eq };
    }
  | {
      readonly kind: "postgresql";
      readonly database: Pick<HomarrDatabasePostgresql, "transaction">;
      readonly schema: OnboardPostgresqlSchema;
      readonly operators: { readonly eq: typeof eq };
    };
