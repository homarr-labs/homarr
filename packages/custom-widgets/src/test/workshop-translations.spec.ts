import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const languageDirectory = resolve(import.meta.dirname, "../../../translation/src/lang");

describe("Workshop navigation translations", () => {
  test("defines the navbar and breadcrumb label in the source locale", async () => {
    const messages = JSON.parse(await readFile(resolve(languageDirectory, "en.json"), "utf8")) as {
      management?: { navbar?: { items?: { workshop?: unknown } } };
      navigationStructure?: { manage?: { workshop?: { label?: unknown } } };
      workshop?: Record<string, unknown>;
    };
    expect(messages.management?.navbar?.items?.workshop).toBe("Workshop");
    expect(messages.navigationStructure?.manage?.workshop?.label).toBe("Workshop");
    expect(messages.workshop).toMatchObject({
      communityMember: "Community member",
      outdated: "Outdated",
      reportCount: expect.any(String),
      reportWarning: expect.any(String),
      reportVisibility: expect.any(String),
      screenshotAlt: expect.any(String),
      upvote: expect.any(String),
      downvote: expect.any(String),
      reportCategory: expect.objectContaining({
        outdated: expect.any(String),
        malicious: expect.any(String),
        spam: expect.any(String),
        copyright: expect.any(String),
        inappropriate: expect.any(String),
        other: expect.any(String),
      }),
      publish: expect.objectContaining({ invalidScreenshot: expect.any(String) }),
    });
  });
});
