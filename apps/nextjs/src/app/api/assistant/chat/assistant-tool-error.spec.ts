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

  test("preserves safe custom-widget validation paths and messages", () => {
    const cause = Object.assign(new Error("validation failed"), {
      issues: [
        { path: ["requests", "fixtures", "path"], message: "Required" },
        { path: ["template"], message: "Use Image instead of img (line 8, column 3)" },
      ],
    });
    const error = new TRPCError({ code: "BAD_REQUEST", cause });

    expect(getSafeAssistantToolError(error, { toolName: "customWidget_create" })).toBe(
      "The custom widget input was invalid: requests.fixtures.path: Required; template: Use Image instead of img (line 8, column 3)",
    );
  });

  test("turns joined templateLines parser failures into actionable assistant and MCP text", () => {
    const cause = Object.assign(new Error("validation failed"), {
      issues: [{ path: ["template"], message: "Element 'img' is not supported; use Image instead" }],
    });
    const error = new TRPCError({
      code: "BAD_REQUEST",
      message: "The custom widget authoring input is invalid",
      cause,
    });

    expect(getSafeAssistantToolError(error, { toolName: "customWidget_previewCreate" })).toBe(
      "The custom widget input was invalid: template: Element 'img' is not supported; use Image instead",
    );
  });

  test("does not expose custom-widget credentials in validation details", () => {
    const error = new TRPCError({
      code: "BAD_REQUEST",
      message: "headers.Authorization: Bearer sk-secret-123456 at https://private.example/api",
    });

    const result = getSafeAssistantToolError(error, { toolName: "customWidget_validate" });
    expect(result).toContain("[REDACTED]");
    expect(result).toContain("[URL]");
    expect(result).not.toContain("sk-secret-123456");
    expect(result).not.toContain("private.example");
  });

  test("keeps non-custom-widget bad requests generic", () => {
    expect(
      getSafeAssistantToolError(new TRPCError({ code: "BAD_REQUEST", message: "sensitive validation" }), {
        toolName: "integration_create",
      }),
    ).toBe("The tool input was not valid.");
  });

  test.each([
    ["BAD_GATEWAY", "data source could not complete", "External request failed for https://private.example/api"],
    ["PAYLOAD_TOO_LARGE", "exceeded a safety limit", "Response exceeds the 1 MiB limit"],
    ["CONFLICT", "changed while this request was running", "Preview session changed; retry"],
  ] as const)("keeps custom-widget %s preview failures actionable and redacted", (code, expected, message) => {
    const error = new TRPCError({ code, message });

    const result = getSafeAssistantToolError(error, { toolName: "customWidget_previewQuery" });

    expect(result).toContain(expected);
    expect(result).not.toContain("private.example");
  });

  test("keeps unrelated gateway, payload, and conflict failures generic", () => {
    for (const code of ["BAD_GATEWAY", "PAYLOAD_TOO_LARGE", "CONFLICT"] as const) {
      expect(
        getSafeAssistantToolError(new TRPCError({ code, message: "private upstream detail" }), {
          toolName: "integration_create",
        }),
      ).toBe("The Homarr tool could not complete this request.");
    }
  });
});
