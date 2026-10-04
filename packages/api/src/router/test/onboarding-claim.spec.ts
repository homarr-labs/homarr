import { describe, expect, it } from "vitest";

import { eq } from "@homarr/db";
import { onboarding, serverSettings, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import {
  claimOnboardingAsync,
  getOnboardingClaimTokenFromCookieHeader,
  isOnboardingClaimValidAsync,
  onboardingClaimCookieName,
  onboardingClaimSettingKey,
} from "../../onboarding-claim";

describe("onboarding claim", () => {
  it("stores only a token hash and validates the claimed browser", async () => {
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "start" });

    const result = await claimOnboardingAsync(db, { now: 1_000, ttlMs: 10_000 });
    expect(result.status).toBe("issued");
    if (result.status !== "issued") throw new Error("Expected an issued claim");

    const row = await db.query.serverSettings.findFirst({
      where: eq(serverSettings.settingKey, onboardingClaimSettingKey),
    });
    expect(row?.value).not.toContain(result.token);
    expect(await isOnboardingClaimValidAsync(db, result.token, 5_000)).toBe(true);
    expect(await isOnboardingClaimValidAsync(db, "not-the-token", 5_000)).toBe(false);
  });

  it("does not let another browser replace a live claim", async () => {
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "start" });
    const issued = await claimOnboardingAsync(db, { now: 1_000, ttlMs: 10_000 });
    if (issued.status !== "issued") throw new Error("Expected an issued claim");

    expect(await claimOnboardingAsync(db, { now: 2_000 })).toEqual({
      status: "locked",
      expiresAt: 11_000,
    });
    expect(await claimOnboardingAsync(db, { currentToken: issued.token, now: 2_000 })).toEqual({
      status: "active",
      token: issued.token,
      expiresAt: 11_000,
    });
  });

  it("allows a new claim after expiry and invalidates the old token", async () => {
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "start" });
    const first = await claimOnboardingAsync(db, { now: 1_000, ttlMs: 100 });
    if (first.status !== "issued") throw new Error("Expected an issued claim");

    const second = await claimOnboardingAsync(db, { now: 1_101, ttlMs: 100 });
    if (second.status !== "issued") throw new Error("Expected a replacement claim");
    expect(second.token).not.toBe(first.token);
    expect(await isOnboardingClaimValidAsync(db, first.token, 1_102)).toBe(false);
    expect(await isOnboardingClaimValidAsync(db, second.token, 1_102)).toBe(true);
  });

  it("refuses claims after setup finishes", async () => {
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "finish", previousStep: "setup" });
    await expect(claimOnboardingAsync(db)).resolves.toEqual({ status: "finished" });
  });

  it("requires an administrator to rotate claims after a user exists", async () => {
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "setup", previousStep: "user" });
    await db.insert(users).values({ id: "owner", name: "owner" });
    await expect(claimOnboardingAsync(db)).resolves.toEqual({ status: "forbidden" });
    await expect(claimOnboardingAsync(db, { force: true })).resolves.toMatchObject({ status: "issued" });
  });

  it("extracts only the exact claim cookie", () => {
    expect(
      getOnboardingClaimTokenFromCookieHeader(`theme=dark; ${onboardingClaimCookieName}=secret-token; other=x`),
    ).toBe("secret-token");
    expect(getOnboardingClaimTokenFromCookieHeader(`${onboardingClaimCookieName}=secret%2Dtoken`)).toBe("secret-token");
    expect(getOnboardingClaimTokenFromCookieHeader(`${onboardingClaimCookieName}=%E0%A4%A`)).toBeUndefined();
    expect(getOnboardingClaimTokenFromCookieHeader(`${onboardingClaimCookieName}-copy=wrong`)).toBeUndefined();
  });
});
