import { describe, expect, it } from "vitest";

import { getJsonImportSubmissionType } from "./submission-import";

describe("Workshop JSON import classification", () => {
  it("switches an existing Custom CSS draft to Custom Widget", () => {
    expect(getJsonImportSubmissionType("customCss")).toBe("customWidget");
  });

  it("classifies JSON before a submission type is selected", () => {
    expect(getJsonImportSubmissionType(null)).toBe("customWidget");
  });
});
