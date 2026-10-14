import type { Database, HomarrDatabasePostgresql } from "@homarr/db";
import type { getSchemaForDatabase, PostgreSqlSchema, SqliteSchema } from "@homarr/db/schema";
import type { OnboardingStep } from "@homarr/definitions";

import type { IdentityOperators, IdentityProcedureResources } from "../-identity/resources";

type EstablishmentTableKey = "users" | "groups" | "groupMembers" | "groupPermissions" | "invites" | "onboarding";

export type UserEstablishmentNativeDatabase =
  | {
      readonly kind: "sqlite";
      readonly db: Database;
      readonly schema: Pick<SqliteSchema, EstablishmentTableKey>;
    }
  | {
      readonly kind: "postgresql";
      readonly db: HomarrDatabasePostgresql;
      readonly schema: Pick<PostgreSqlSchema, EstablishmentTableKey>;
    };

export interface UserEstablishmentResources extends Pick<IdentityProcedureResources, "createId" | "providers"> {
  readonly getSchemaForDatabase: typeof getSchemaForDatabase;
  readonly operators: Pick<IdentityOperators, "eq" | "and" | "max">;
  readonly clock: { now(): Date };
  nativeDatabase(db: Database): UserEstablishmentNativeDatabase;
}

export interface PreparedEstablishmentUser {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
  readonly password: string;
}

export interface PreparedInitialGroup {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly position: number;
}

export interface PreparedUserInitialization {
  readonly userRow: PreparedEstablishmentUser;
  readonly groupRow: PreparedInitialGroup;
  readonly nextStep: Extract<OnboardingStep, "group" | "setup">;
}
