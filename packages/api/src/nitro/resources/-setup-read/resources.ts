import type { eq } from "drizzle-orm";

import type { SqliteSchema } from "@homarr/db/schema";

import type { BackendContext, BackendRequestResources } from "../../context";

export interface SetupReadAdmission {
  readonly database: BackendContext["db"];
  readonly schema: Pick<SqliteSchema, "users" | "onboarding" | "serverSettings">;
  readonly signal: AbortSignal;
  assertCurrent(): void;
}

export interface SetupReadResources {
  readonly operators: { readonly eq: typeof eq };
  now(): number;
}

export interface SetupBackedContextInput extends BackendRequestResources {
  readonly principal: BackendContext["principal"];
  readonly deviceType: BackendContext["deviceType"];
  readonly baseUrl: NonNullable<BackendContext["baseUrl"]>;
  readonly demo: BackendContext["demo"];
  readonly reportError?: BackendContext["reportError"];
  readonly flattenDomainError?: BackendContext["flattenDomainError"];
}
