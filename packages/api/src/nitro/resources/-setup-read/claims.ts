import { createHash, timingSafeEqual } from "node:crypto";

export const onboardingClaimCookieName = "homarr-onboarding-claim";
export const onboardingClaimSettingKey = "__onboarding_claim";

interface StoredOnboardingClaim {
  readonly hash: string;
  readonly expiresAt: number;
}

function parseStoredClaim(value: string): StoredOnboardingClaim | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("hash" in parsed) || typeof parsed.hash !== "string" || !/^[0-9a-f]{64}$/.test(parsed.hash)) return null;
    if (!("expiresAt" in parsed) || typeof parsed.expiresAt !== "number" || !Number.isSafeInteger(parsed.expiresAt))
      return null;
    return { hash: parsed.hash, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function matchesStoredOnboardingClaim(value: string, token: string, now: number): boolean {
  const claim = parseStoredClaim(value);
  if (!claim || claim.expiresAt <= now || token.length === 0) return false;
  const expected = Buffer.from(claim.hash, "hex");
  const actual = Buffer.from(createHash("sha256").update(token).digest("hex"), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function getOnboardingClaimTokenFromCookieHeader(cookieHeader: string | null): string | undefined {
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
}
