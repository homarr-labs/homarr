import { describe, expect, it } from "vitest";

import { getOnboardingAccessState } from "./claim-state";

describe("getOnboardingAccessState", () => {
  it("requires existing installations to sign in even when a legacy step normalizes to start", () => {
    expect(
      getOnboardingAccessState({
        currentStep: "start",
        canConfigurePrivileged: false,
        hasUsers: true,
        externalAuthEnabled: false,
      }),
    ).toBe("signIn");
  });

  it.each([
    [{ currentStep: "start", canConfigurePrivileged: false, hasUsers: false, externalAuthEnabled: false }, "ready"],
    [{ currentStep: "user", canConfigurePrivileged: false, hasUsers: false, externalAuthEnabled: false }, "claim"],
    [{ currentStep: "setup", canConfigurePrivileged: false, hasUsers: false, externalAuthEnabled: true }, "signIn"],
    [{ currentStep: "setup", canConfigurePrivileged: true, hasUsers: true, externalAuthEnabled: false }, "ready"],
    [{ currentStep: "finish", canConfigurePrivileged: false, hasUsers: true, externalAuthEnabled: false }, "ready"],
  ] as const)("resolves %o to %s", (environment, expected) => {
    expect(getOnboardingAccessState(environment)).toBe(expected);
  });
});
