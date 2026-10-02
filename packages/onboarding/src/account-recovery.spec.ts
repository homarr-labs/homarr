import { describe, expect, it } from "vitest";

import { didCredentialsSignInFail } from "./account-recovery";

describe("didCredentialsSignInFail", () => {
  it.each([
    [undefined, true],
    [{ ok: false }, true],
    [{ ok: true, error: "CredentialsSignin" }, true],
    [{ ok: true, error: undefined }, false],
  ] as const)("resolves %o to %s", (result, expected) => {
    expect(didCredentialsSignInFail(result)).toBe(expected);
  });
});
