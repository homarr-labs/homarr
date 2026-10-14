import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { getOnboardingClaimTokenFromCookieHeader, matchesStoredOnboardingClaim } from "./claims";

const token = "disposable setup-read primitive";
const hash = createHash("sha256").update(token).digest("hex");
const stored = JSON.stringify({ hash, expiresAt: 101, extra: true });
assert.equal(matchesStoredOnboardingClaim(stored, token, 100), true);
assert.equal(matchesStoredOnboardingClaim(stored, token, 101), false);
assert.equal(matchesStoredOnboardingClaim(stored, "different", 100), false);
assert.equal(matchesStoredOnboardingClaim(stored, "", 100), false);
assert.equal(matchesStoredOnboardingClaim("null", token, 100), false);
assert.equal(matchesStoredOnboardingClaim("malformed", token, 100), false);
assert.equal(
  matchesStoredOnboardingClaim(JSON.stringify({ hash: hash.toUpperCase(), expiresAt: 101 }), token, 100),
  false,
);
assert.equal(matchesStoredOnboardingClaim(JSON.stringify({ hash, expiresAt: 101.5 }), token, 100), false);
assert.equal(matchesStoredOnboardingClaim(JSON.stringify({ hash, expiresAt: -1 }), token, -2), true);
assert.equal(getOnboardingClaimTokenFromCookieHeader(null), undefined);
assert.equal(
  getOnboardingClaimTokenFromCookieHeader(
    "other=x; homarr-onboarding-claim = first%3Dvalue ; homarr-onboarding-claim=second",
  ),
  "first=value",
);
assert.equal(
  getOnboardingClaimTokenFromCookieHeader("homarr-onboarding-claim=%ZZ; homarr-onboarding-claim=second"),
  undefined,
);
assert.equal(
  getOnboardingClaimTokenFromCookieHeader("homarr-onboarding-claim=; homarr-onboarding-claim=second"),
  undefined,
);
assert.equal(getOnboardingClaimTokenFromCookieHeader("homarr-onboarding-claim=  %20%2B  "), " +");
console.log(
  JSON.stringify(
    {
      cookieAndClaimPrimitives: "passed",
      databaseEvaluation: false,
      sqlChecks: "prepared separately; held until public graph acceptance",
    },
    null,
    2,
  ),
);
