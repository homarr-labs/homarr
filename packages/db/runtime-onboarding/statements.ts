import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { credentialsAdminGroup } from "@homarr/definitions";

import { authGroupParentLocks, authUserParentLock } from "../runtime-authority/locks";
import { nativeCredentialPolicyStatements } from "../runtime-auth-credential/statements";
import {
  authCredentialRecord,
  authCredentialTimestamp,
  singleAuthCredentialRow,
  requireAuthCredentialClock,
} from "../runtime-auth-credential/validation";
import { authCredentialDomainLockStatements } from "../runtime-auth-session/statements";
import { captureOnboardingStep, rejectOnboarding } from "./contracts";
import type { CapturedOnboardingMutation, OnboardingClaimResult, OnboardingStepWitness } from "./contracts";

export interface OnboardingExpiryWitness {
  readonly kind: "validated-expiry";
  readonly source: "claim" | "session";
  readonly expiresAt: number;
  readonly hostDeadlineAt: number | null;
}

export type OnboardingStatement = SQL | OnboardingExpiryWitness;
type Engine = "sqlite" | "postgresql";
type Statements<T> = Generator<OnboardingStatement, T, readonly unknown[]>;
interface StoredClaim {
  readonly hash: string;
  readonly expiresAt: number;
}
interface Observation {
  readonly step: OnboardingStepWitness;
  readonly hasUsers: boolean;
  readonly claim: string | null;
  readonly now: number;
}

const stepFields = sql`"id", "step", "previous_step" AS "previousStep"`;
const claimFields = sql`"setting_key" AS "settingKey", "value"`;
const groupFields = sql`"id", "name", "position", "owner_id" AS "ownerId"`;
const userFields = sql`"id", "name", "email", "password", "provider"`;

const same = (engine: Engine, column: SQL, value: string | null) => {
  if (engine === "sqlite") return sql`${column} IS ${value}`;
  return sql`${column} IS NOT DISTINCT FROM ${value}`;
};

const checkedBoolean = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return rejectOnboarding();
};

const sameStep = (left: OnboardingStepWitness, right: OnboardingStepWitness) =>
  left.id === right.id && left.step === right.step && left.previousStep === right.previousStep;

const parseClaim = (raw: string | null): StoredClaim | null => {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const row = authCredentialRecord(parsed);
    if (typeof row.hash !== "string" || !/^[0-9a-f]{64}$/.test(row.hash)) return null;
    const expiresAt = authCredentialTimestamp(row.expiresAt);
    return { hash: row.hash, expiresAt };
  } catch {
    return null;
  }
};

const matches = (claim: StoredClaim, token: string | null, now: number) => {
  if (!token || claim.expiresAt <= now) return false;
  const actual = createHash("sha256").update(token).digest();
  return timingSafeEqual(Buffer.from(claim.hash, "hex"), actual);
};

function* observe(engine: Engine, prepared: CapturedOnboardingMutation): Statements<Observation> {
  const step = captureOnboardingStep(
    singleAuthCredentialRow(yield sql`SELECT ${stepFields} FROM "onboarding" LIMIT 2`),
  );
  const users = singleAuthCredentialRow(yield sql`SELECT EXISTS(SELECT 1 FROM "user") AS "hasUsers"`);
  const rows = yield sql`SELECT ${claimFields} FROM "serverSetting" WHERE "setting_key" = '__onboarding_claim' LIMIT 2`;
  let claim: string | null = null;
  if (rows.length !== 0) {
    const row = singleAuthCredentialRow(rows);
    if (
      row.settingKey !== "__onboarding_claim" ||
      typeof row.value !== "string" ||
      Buffer.byteLength(row.value, "utf8") > 4096
    )
      return rejectOnboarding();
    claim = row.value;
  }
  let clock = sql`CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`;
  if (engine === "postgresql")
    clock = sql`CAST(FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) AS DOUBLE PRECISION)`;
  const now = requireAuthCredentialClock(
    singleAuthCredentialRow(yield sql`SELECT ${clock} AS observed_now`).observed_now,
    prepared.configuration,
  );
  return { step, hasUsers: checkedBoolean(users.hasUsers), claim, now };
}

function* transition(
  engine: Engine,
  before: OnboardingStepWitness,
  previousStep: string,
  step: string,
): Statements<OnboardingStepWitness> {
  const result = captureOnboardingStep(
    singleAuthCredentialRow(
      yield sql`
    UPDATE "onboarding" SET "previous_step" = ${previousStep}, "step" = ${step}
    WHERE "id" = ${before.id} AND "step" = ${before.step}
      AND ${same(engine, sql`"previous_step"`, before.previousStep)} RETURNING ${stepFields}
  `,
    ),
  );
  if (result.id !== before.id || result.step !== step || result.previousStep !== previousStep)
    return rejectOnboarding();
  return result;
}

function* nextPosition(engine: Engine): Statements<number> {
  const row = singleAuthCredentialRow(yield sql`SELECT MAX("position") AS "position" FROM "group"`);
  let current = row.position;
  if (current === null) current = 1;
  if (typeof current !== "number" || !Number.isSafeInteger(current)) return rejectOnboarding();
  const position = current + 1;
  if (!Number.isSafeInteger(position) || (engine === "postgresql" && (position < -32768 || position > 32767)))
    return rejectOnboarding();
  return position;
}

const requireEmpty = (rows: readonly unknown[]) => {
  if (rows.length !== 0) return rejectOnboarding();
};

const requireFields = (rows: readonly unknown[], expected: Readonly<Record<string, string | number | null>>) => {
  const row = singleAuthCredentialRow(rows);
  for (const [key, value] of Object.entries(expected)) if (row[key] !== value) return rejectOnboarding();
};

function* adminPolicy(engine: Engine, prepared: CapturedOnboardingMutation): Statements<boolean> {
  const authority = prepared.invocation.authority;
  if (authority.kind !== "stored-admin") return false;
  const policy = yield* nativeCredentialPolicyStatements(engine, authority.credential, prepared.configuration);
  if (authority.credential.type === "opaque-session") {
    yield {
      kind: "validated-expiry",
      source: "session",
      expiresAt: authority.credential.expiresAt,
      hostDeadlineAt: authority.credential.hostDeadlineAt,
    };
  }
  return policy.permissions.includes("admin");
}

export function* onboardingStatements(
  engine: Engine,
  prepared: CapturedOnboardingMutation,
): Statements<OnboardingClaimResult | void> {
  const { invocation, configuration } = prepared;
  yield* authCredentialDomainLockStatements(engine);
  const before = yield* observe(engine, prepared);
  let expectedStep = before.step;
  let expectedClaim = before.claim;
  let expectedUsers = before.hasUsers;
  let result: OnboardingClaimResult | void = undefined;
  let claimExpiry: StoredClaim | null = null;
  let lockedClaimExpiry: StoredClaim | null = null;
  let groupPost: Readonly<Record<string, string | number | null>> | undefined;

  if (invocation.kind === "claim" && before.step.step === "finish") {
    result = { status: "finished" };
  } else {
    if (engine === "postgresql" && invocation.authority.kind === "stored-admin") {
      requireFields(yield authUserParentLock(invocation.authority.credential.userId), {
        id: invocation.authority.credential.userId,
      });
      const groups = yield authGroupParentLocks(configuration.maximumSnapshotRows);
      if (groups.length > configuration.maximumSnapshotRows) return rejectOnboarding();
    }
    const isAdmin = yield* adminPolicy(engine, prepared);
    const existingClaim = parseClaim(before.claim);

    if (invocation.kind === "claim") {
      if (before.hasUsers && !isAdmin) {
        result = { status: "forbidden" };
      } else if (existingClaim && matches(existingClaim, invocation.authority.currentToken, before.now)) {
        const token = invocation.authority.currentToken;
        if (token === null) return rejectOnboarding();
        claimExpiry = existingClaim;
        result = { status: "active", token, expiresAt: existingClaim.expiresAt };
      } else if (existingClaim && existingClaim.expiresAt > before.now && !isAdmin) {
        lockedClaimExpiry = existingClaim;
        result = { status: "locked", expiresAt: existingClaim.expiresAt };
      } else {
        const token = randomBytes(32).toString("base64url");
        const expiresAt = authCredentialTimestamp(before.now + 14_400_000);
        const hash = createHash("sha256").update(token).digest("hex");
        const value = JSON.stringify({ hash, expiresAt });
        let rows: readonly unknown[];
        if (before.claim === null) {
          rows = yield sql`INSERT INTO "serverSetting" ("setting_key", "value")
            SELECT '__onboarding_claim', ${value} WHERE NOT EXISTS (
              SELECT 1 FROM "serverSetting" WHERE "setting_key" = '__onboarding_claim'
            ) RETURNING ${claimFields}`;
        } else {
          rows = yield sql`UPDATE "serverSetting" SET "value" = ${value}
            WHERE "setting_key" = '__onboarding_claim' AND "value" = ${before.claim} RETURNING ${claimFields}`;
        }
        requireFields(rows, { settingKey: "__onboarding_claim", value });
        expectedClaim = value;
        claimExpiry = { hash, expiresAt };
        result = { status: "issued", token, expiresAt };
      }
      if (claimExpiry)
        yield { kind: "validated-expiry", source: "claim", expiresAt: claimExpiry.expiresAt, hostDeadlineAt: null };
    } else {
      if (invocation.authority.kind === "stored-claim") {
        if (before.hasUsers || !existingClaim || !matches(existingClaim, invocation.authority.token, before.now))
          return rejectOnboarding();
        claimExpiry = existingClaim;
      } else if (!isAdmin) return rejectOnboarding();
      if (claimExpiry)
        yield { kind: "validated-expiry", source: "claim", expiresAt: claimExpiry.expiresAt, hostDeadlineAt: null };

      const external =
        configuration.enabledProviders.includes("ldap") || configuration.enabledProviders.includes("oidc");
      if (invocation.kind === "nextStep") {
        if (invocation.firstRead.step !== "start" || invocation.firstRead.id !== before.step.id)
          return rejectOnboarding();
        if (before.step.step === "start") {
          let step = "setup";
          if (configuration.enabledProviders.includes("credentials") && !before.hasUsers) step = "user";
          else if (external) step = "group";
          expectedStep = yield* transition(engine, before.step, "start", step);
        }
      } else if (invocation.kind === "initUser") {
        if (before.step.step !== "user" || before.hasUsers || !configuration.enabledProviders.includes("credentials"))
          return rejectOnboarding();
        const user = invocation.userRow;
        requireEmpty(
          yield sql`SELECT "id" FROM "user" WHERE ("name" = ${user.name} AND "provider" = 'credentials') OR "id" = ${user.id} LIMIT 1`,
        );
        requireEmpty(
          yield sql`SELECT "id" FROM "group" WHERE "name" = ${credentialsAdminGroup} OR "id" = ${invocation.groupId} LIMIT 1`,
        );
        const position = yield* nextPosition(engine);
        groupPost = { id: invocation.groupId, name: credentialsAdminGroup, ownerId: user.id, position };
        requireFields(
          yield sql`INSERT INTO "user" ("id", "name", "email", "password", "provider")
          VALUES (${user.id}, ${user.name}, ${user.email}, ${user.password}, 'credentials') RETURNING ${userFields}`,
          { ...user, provider: "credentials" },
        );
        requireFields(
          yield sql`INSERT INTO "group" ("id", "name", "owner_id", "position")
          VALUES (${invocation.groupId}, ${credentialsAdminGroup}, ${user.id}, ${position}) RETURNING ${groupFields}`,
          groupPost,
        );
        requireFields(
          yield sql`INSERT INTO "groupPermission" ("group_id", "permission")
          VALUES (${invocation.groupId}, 'admin') RETURNING "group_id" AS "groupId", "permission"`,
          { groupId: invocation.groupId, permission: "admin" },
        );
        requireFields(
          yield sql`INSERT INTO "groupMember" ("group_id", "user_id")
          VALUES (${invocation.groupId}, ${user.id}) RETURNING "group_id" AS "groupId", "user_id" AS "userId"`,
          { groupId: invocation.groupId, userId: user.id },
        );
        let step = "setup";
        if (external) step = "group";
        expectedStep = yield* transition(engine, before.step, "user", step);
        expectedUsers = true;
      } else {
        if (before.step.step !== "group" || !external) return rejectOnboarding();
        requireEmpty(
          yield sql`SELECT "id" FROM "group" WHERE ("name" LIKE ${invocation.name} AND "id" <> '') OR "id" = ${invocation.groupId} LIMIT 1`,
        );
        const position = yield* nextPosition(engine);
        groupPost = { id: invocation.groupId, name: invocation.name, ownerId: null, position };
        expectedStep = yield* transition(engine, before.step, "group", "setup");
        requireFields(
          yield sql`INSERT INTO "group" ("id", "name", "position")
          VALUES (${invocation.groupId}, ${invocation.name}, ${position}) RETURNING ${groupFields}`,
          groupPost,
        );
        requireFields(
          yield sql`INSERT INTO "groupPermission" ("group_id", "permission")
          VALUES (${invocation.groupId}, 'admin') RETURNING "group_id" AS "groupId", "permission"`,
          { groupId: invocation.groupId, permission: "admin" },
        );
      }
    }
    if (invocation.authority.kind === "stored-admin" && (yield* adminPolicy(engine, prepared)) !== isAdmin)
      return rejectOnboarding();
  }

  if (groupPost && (invocation.kind === "initUser" || invocation.kind === "initialExternalGroup")) {
    requireFields(yield sql`SELECT ${groupFields} FROM "group" WHERE "id" = ${invocation.groupId}`, groupPost);
    requireFields(
      yield sql`SELECT "group_id" AS "groupId", "permission" FROM "groupPermission" WHERE "group_id" = ${invocation.groupId} LIMIT 2`,
      { groupId: invocation.groupId, permission: "admin" },
    );
    const members =
      yield sql`SELECT "group_id" AS "groupId", "user_id" AS "userId" FROM "groupMember" WHERE "group_id" = ${invocation.groupId} LIMIT 2`;
    if (invocation.kind === "initUser") {
      requireFields(members, { groupId: invocation.groupId, userId: invocation.userRow.id });
      requireFields(yield sql`SELECT ${userFields} FROM "user" LIMIT 2`, {
        ...invocation.userRow,
        provider: "credentials",
      });
    } else requireEmpty(members);
  }
  const after = yield* observe(engine, prepared);
  if (!sameStep(after.step, expectedStep) || after.claim !== expectedClaim || after.hasUsers !== expectedUsers)
    return rejectOnboarding();
  const observedClaimExpiry = claimExpiry ?? lockedClaimExpiry;
  if (observedClaimExpiry) {
    const stored = parseClaim(after.claim);
    if (
      !stored ||
      stored.hash !== observedClaimExpiry.hash ||
      stored.expiresAt !== observedClaimExpiry.expiresAt ||
      stored.expiresAt <= after.now
    )
      return rejectOnboarding();
    if (claimExpiry)
      yield { kind: "validated-expiry", source: "claim", expiresAt: stored.expiresAt, hostDeadlineAt: null };
  }
  return result;
}
