import type { AdapterAccount } from "@auth/core/adapters";

import { sql } from "@homarr/db";
import type { PersistenceRuntime } from "@homarr/db/runtime";
import { postgresqlSchema } from "@homarr/db/schema";

import { IssuerStagingError } from "./persistence";
import type { IssuerOperationBounds, IssuerReadRepository, IssuerUserRecord } from "./persistence";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new IssuerStagingError();
  return Object.fromEntries(Object.entries(value));
}

function string(value: unknown): string {
  if (typeof value !== "string") throw new IssuerStagingError();
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  return string(value);
}

function isLowercase(value: string): value is Lowercase<string> {
  return value === value.toLowerCase();
}

function date(engine: PersistenceRuntime["engine"], value: unknown): Date | null {
  if (value === null) return null;
  let decoded: unknown = value;
  if (engine === "postgresql" && typeof value === "string")
    decoded = postgresqlSchema.users.emailVerified.mapFromDriverValue(value);
  const time = decoded instanceof Date ? decoded.getTime() : decoded;
  if (typeof time !== "number" || !Number.isSafeInteger(time)) throw new IssuerStagingError();
  return new Date(time);
}

function user(engine: PersistenceRuntime["engine"], row: Record<string, unknown>): IssuerUserRecord {
  const provider = row.provider;
  const colorScheme = row.colorScheme;
  if (provider !== "credentials" && provider !== "ldap" && provider !== "oidc") throw new IssuerStagingError();
  if (colorScheme !== "dark" && colorScheme !== "light" && colorScheme !== "auto") throw new IssuerStagingError();
  return {
    id: string(row.id),
    name: nullableString(row.name),
    email: nullableString(row.email),
    emailVerified: date(engine, row.emailVerified),
    image: nullableString(row.image),
    password: nullableString(row.password),
    provider,
    colorScheme,
  };
}

export function createIssuerSqlRepository(
  runtime: PersistenceRuntime,
  input: IssuerOperationBounds,
  track: Set<Promise<unknown>>,
): IssuerReadRepository {
  const operation = Object.freeze({ ...input });
  const fields = sql`u."id", u."name", u."email", u."email_verified" AS "emailVerified",
    u."image", u."password", u."provider", u."color_scheme" AS "colorScheme"`;
  const read = async (statement: ReturnType<typeof sql>): Promise<Record<string, unknown> | null> => {
    const execute = async () => {
      try {
        const rows =
          runtime.engine === "sqlite"
            ? runtime.boundedTransactionSync(operation, (database) => database.all<unknown>(statement))
            : await runtime.boundedSnapshotAsync(
                operation,
                async (database) => (await database.execute<Record<string, unknown>>(statement)).rows,
              );
        if (rows.length > 1) throw new IssuerStagingError();
        if (rows.length === 0) return null;
        return record(rows[0]);
      } catch {
        throw new IssuerStagingError();
      }
    };
    const pending = execute();
    track.add(pending);
    try {
      return await pending;
    } finally {
      track.delete(pending);
    }
  };
  const readUser = async (statement: ReturnType<typeof sql>) => {
    const row = await read(statement);
    if (!row) return null;
    return user(runtime.engine, row);
  };
  return Object.freeze({
    findUserById: (id: string) => readUser(sql`SELECT ${fields} FROM "user" u WHERE u."id" = ${id} LIMIT 1`),
    findUserByName: (selector: { name: string; provider: "credentials" }) =>
      readUser(
        sql`SELECT ${fields} FROM "user" u WHERE u."name" = ${selector.name} AND u."provider" = ${selector.provider} LIMIT 1`,
      ),
    findUserByEmail: (selector: { email: string; provider: "credentials" | "ldap" | "oidc" }) =>
      readUser(
        sql`SELECT ${fields} FROM "user" u WHERE u."email" = ${selector.email} AND u."provider" = ${selector.provider} LIMIT 1`,
      ),
    async findAccount(selector: { provider: string; providerAccountId: string }) {
      const row =
        await read(sql`SELECT "user_id" AS "userId", "type", "provider", "provider_account_id" AS "providerAccountId",
        "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state"
        FROM "account" WHERE "provider" = ${selector.provider} AND "provider_account_id" = ${selector.providerAccountId} LIMIT 1`);
      if (!row) return null;
      const type = row.type;
      if (type !== "oidc" && type !== "oauth" && type !== "email" && type !== "webauthn")
        throw new IssuerStagingError();
      const expiresAt = row.expires_at;
      if (expiresAt !== null && (typeof expiresAt !== "number" || !Number.isSafeInteger(expiresAt)))
        throw new IssuerStagingError();
      const account: AdapterAccount = {
        userId: string(row.userId),
        type,
        provider: string(row.provider),
        providerAccountId: string(row.providerAccountId),
      };
      const storedTokenType = nullableString(row.token_type);
      if (storedTokenType !== null && !isLowercase(storedTokenType)) throw new IssuerStagingError();
      return {
        ...account,
        refresh_token: nullableString(row.refresh_token) ?? undefined,
        access_token: nullableString(row.access_token) ?? undefined,
        expires_at: expiresAt ?? undefined,
        token_type: storedTokenType ?? undefined,
        scope: nullableString(row.scope) ?? undefined,
        id_token: nullableString(row.id_token) ?? undefined,
        session_state: nullableString(row.session_state) ?? undefined,
      };
    },
    async findSession(token: string) {
      const row =
        await read(sql`SELECT ${fields}, s."session_token" AS "sessionToken", s."user_id" AS "sessionUserId", s."expires"
        FROM "session" s INNER JOIN "user" u ON u."id" = s."user_id" WHERE s."session_token" = ${token} LIMIT 1`);
      if (!row) return null;
      const expires = date(runtime.engine, row.expires);
      if (!expires) throw new IssuerStagingError();
      return {
        user: user(runtime.engine, row),
        session: { sessionToken: string(row.sessionToken), userId: string(row.sessionUserId), expires },
      };
    },
  });
}
