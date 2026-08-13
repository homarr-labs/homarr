import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { serverSettings } from "@homarr/db/schema";

export const onboardingClaimCookieName = "homarr-onboarding-claim";
export const onboardingClaimSettingKey = "__onboarding_claim";
export const onboardingClaimTtlMs = 4 * 60 * 60 * 1000;

interface StoredOnboardingClaim {
  hash: string;
  expiresAt: number;
}

export type ClaimOnboardingResult =
  | { status: "issued" | "active"; token: string; expiresAt: number }
  | { status: "locked"; expiresAt: number }
  | { status: "finished" | "forbidden" };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const parseStoredClaim = (value: string): StoredOnboardingClaim | null => {
  try {
    const parsed = JSON.parse(value) as Partial<StoredOnboardingClaim>;
    if (typeof parsed.hash !== "string" || !/^[0-9a-f]{64}$/.test(parsed.hash)) return null;
    if (typeof parsed.expiresAt !== "number" || !Number.isSafeInteger(parsed.expiresAt)) return null;
    return { hash: parsed.hash, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
};

const tokenMatches = (claim: StoredOnboardingClaim, token: string, now: number) => {
  if (claim.expiresAt <= now || token.length === 0) return false;
  const expected = Buffer.from(claim.hash, "hex");
  const actual = Buffer.from(hashToken(token), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const getClaimRowAsync = async (db: Database) =>
  await db.query.serverSettings.findFirst({ where: eq(serverSettings.settingKey, onboardingClaimSettingKey) });

export const getOnboardingClaimTokenFromCookieHeader = (cookieHeader: string | null) => {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== onboardingClaimCookieName) continue;
    const value = part.slice(separator + 1).trim();
    if (!value) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export const isOnboardingClaimValidAsync = async (db: Database, token: string | undefined, now = Date.now()) => {
  if (!token) return false;
  const row = await getClaimRowAsync(db);
  const claim = row ? parseStoredClaim(row.value) : null;
  return claim ? tokenMatches(claim, token, now) : false;
};

export const isClaimOnlyOnboardingAccessAllowedAsync = async (
  db: Database,
  token: string | undefined,
  now = Date.now(),
) => {
  const existingUser = await db.query.users.findFirst({ columns: { id: true } });
  return !existingUser && (await isOnboardingClaimValidAsync(db, token, now));
};

export const claimOnboardingAsync = async (
  db: Database,
  options: { currentToken?: string; force?: boolean; now?: number; ttlMs?: number } = {},
): Promise<ClaimOnboardingResult> => {
  const onboarding = await db.query.onboarding.findFirst();
  if (onboarding?.step === "finish") return { status: "finished" };
  const existingUser = await db.query.users.findFirst({ columns: { id: true } });
  if (existingUser && !options.force) return { status: "forbidden" };

  const now = options.now ?? Date.now();
  const currentRow = await getClaimRowAsync(db);
  const currentClaim = currentRow ? parseStoredClaim(currentRow.value) : null;
  if (currentClaim && options.currentToken && tokenMatches(currentClaim, options.currentToken, now)) {
    return { status: "active", token: options.currentToken, expiresAt: currentClaim.expiresAt };
  }
  if (currentClaim && currentClaim.expiresAt > now && !options.force) {
    return { status: "locked", expiresAt: currentClaim.expiresAt };
  }

  if (currentRow) {
    await db
      .delete(serverSettings)
      .where(and(eq(serverSettings.settingKey, onboardingClaimSettingKey), eq(serverSettings.value, currentRow.value)));
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = now + (options.ttlMs ?? onboardingClaimTtlMs);
  const value = JSON.stringify({ hash: hashToken(token), expiresAt } satisfies StoredOnboardingClaim);
  try {
    await db.insert(serverSettings).values({ settingKey: onboardingClaimSettingKey, value });
  } catch (error) {
    const winner = await getClaimRowAsync(db);
    const winnerClaim = winner ? parseStoredClaim(winner.value) : null;
    if (winnerClaim?.expiresAt && winnerClaim.expiresAt > now) {
      return { status: "locked", expiresAt: winnerClaim.expiresAt };
    }
    throw error;
  }
  return { status: "issued", token, expiresAt };
};
