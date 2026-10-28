// @vitest-environment node
import { describe, expect, test } from "vitest";

import { generateTotpCode, InvalidTotpSecretError } from "../totp";

// RFC 6238 appendix B uses HMAC-SHA1 and 8 digits. OpenMediaVault uses 6 digits,
// which is the same truncated integer modulo 1_000_000. The shared secret is the
// ASCII string "12345678901234567890", Base32-encoded below.
const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("OpenMediaVault TOTP", () => {
  test.each([
    [59_000, "287082"],
    [1_111_111_109_000, "081804"],
    [1_111_111_111_000, "050471"],
    [1_234_567_890_000, "005924"],
    [2_000_000_000_000, "279037"],
    [20_000_000_000_000, "353130"],
  ])("matches the RFC 6238 SHA1 vector at %s ms", (timestampMs, code) => {
    expect(generateTotpCode(rfcSecret, timestampMs)).toBe(code);
  });

  test("accepts lowercase secrets and ignores spaces", () => {
    expect(generateTotpCode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq", 59_000)).toBe("287082");
  });

  test.each(["123456", "234567", "12 34 56", "not-a-secret", "JBSWY3DP", ""])(
    "rejects %j before it can be used as a shared secret",
    (secret) => {
      expect(() => generateTotpCode(secret)).toThrow(InvalidTotpSecretError);
    },
  );
});
