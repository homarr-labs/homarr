import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DynamicBreadcrumb", () => {
  it("falls back to the raw segment when a path segment has no translation", () => {
    const source = readFileSync(
      `${process.cwd()}/apps/nextjs/src/components/navigation/dynamic-breadcrumb.tsx`,
      "utf8",
    );

    // Dynamic ids (e.g. /manage/custom-widgets/workshop/<id>) have no message and are
    // not mapped while their page loads; resolving them must not raise MISSING_MESSAGE.
    expect(source).toContain("t.has(labelKey)");
    expect(source).toContain("mappedValue ?? (t.has(labelKey) ? t(labelKey) : pathnamePart)");
    expect(source).not.toMatch(/\{t\(`\$\{translationKey\}\.label`/u);
  });
});
