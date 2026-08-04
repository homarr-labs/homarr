import { TRPCError } from "@trpc/server";
import { describe, expect, test } from "vitest";

import { getSafeAssistantToolError } from "./assistant-tool-error";

describe("getSafeAssistantToolError", () => {
  test("keeps authorization and compatibility failures actionable", () => {
    expect(getSafeAssistantToolError(new TRPCError({ code: "FORBIDDEN" }))).toBe(
      "You do not have permission to perform this action.",
    );
    expect(getSafeAssistantToolError(new TRPCError({ code: "NOT_FOUND" }))).toBe(
      "The requested resource was not found or is not compatible with this tool.",
    );
  });

  test("recognizes wrapped integration credential decryption failures", () => {
    const cause = Object.assign(new Error("error:1C800064:Provider routines::bad decrypt"), {
      code: "ERR_OSSL_BAD_DECRYPT",
    });
    const wrapped = new Error("Calendar tool failed", { cause });

    expect(getSafeAssistantToolError(wrapped)).toContain("Re-save the integration credentials");
  });

  test("does not expose unexpected internal errors", () => {
    expect(getSafeAssistantToolError(new Error("database password was secret"))).toBe(
      "The Homarr tool could not complete this request.",
    );
  });
});
