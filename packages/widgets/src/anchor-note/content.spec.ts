import { describe, expect, it } from "vitest";

import { parseStoredOperations, storedContentToPlainText, stringifyDelta } from "./content";

describe("Anchor Note stored content", () => {
  it("preserves valid Delta operations and extracts their text", () => {
    const content = JSON.stringify({
      ops: [{ insert: "Hello ", attributes: { bold: true } }, { insert: { image: "ignored" } }, { insert: "world\n" }],
    });

    expect(parseStoredOperations(content)).toEqual([
      { insert: "Hello ", attributes: { bold: true } },
      { insert: { image: "ignored" } },
      { insert: "world\n" },
    ]);
    expect(storedContentToPlainText(content)).toBe("Hello world");
  });

  it("keeps legacy plain text readable and normalizes an editor newline", () => {
    expect(parseStoredOperations("legacy note")).toEqual([{ insert: "legacy note\n" }]);
    expect(storedContentToPlainText("legacy note")).toBe("legacy note");
  });

  it("falls back to an empty Delta when editor output is invalid", () => {
    expect(stringifyDelta({ invalid: true })).toBe('{"ops":[{"insert":"\\n"}]}');
  });
});
