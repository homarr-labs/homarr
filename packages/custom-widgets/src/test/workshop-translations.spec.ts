import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const languageDirectory = resolve(import.meta.dirname, "../../../translation/src/lang");

describe("Workshop navigation translations", () => {
  test("defines the breadcrumb labels for the Custom Widgets sub-routes", async () => {
    const messages = JSON.parse(await readFile(resolve(languageDirectory, "en.json"), "utf8")) as {
      management?: { navbar?: { items?: { workshop?: unknown } } };
      navigationStructure?: {
        manage?: {
          workshop?: unknown;
          "custom-widgets"?: {
            workshop?: { label?: unknown };
            publish?: { label?: unknown };
          };
        };
      };
      customWidget?: { page?: { tabs?: Record<string, unknown> } };
      workshop?: Record<string, unknown>;
    };

    // The Workshop is reached through the Custom Widgets tabs, not its own navbar entry.
    expect(messages.management?.navbar?.items?.workshop).toBeUndefined();
    expect(messages.navigationStructure?.manage?.workshop).toBeUndefined();
    expect(messages.navigationStructure?.manage?.["custom-widgets"]?.workshop?.label).toBe("Workshop");
    expect(messages.navigationStructure?.manage?.["custom-widgets"]?.publish?.label).toBe("Publish to Workshop");
    expect(messages.customWidget?.page?.tabs).toMatchObject({
      installed: "Installed",
      workshop: "Workshop",
      ariaLabel: expect.any(String),
    });

    expect(messages.workshop).toMatchObject({
      communityMember: "Community member",
      outdated: "Outdated",
      install: "Install",
      back: expect.any(String),
      listAriaLabel: expect.any(String),
      installReviewTitle: expect.any(String),
      emptyFilteredDescription: expect.any(String),
      importCssConfirm: expect.any(String),
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
      publish: expect.objectContaining({
        invalidScreenshot: expect.any(String),
      }),
    });
  });

  test("drops the message keys that only existed for the stacked install modals", async () => {
    const messages = JSON.parse(await readFile(resolve(languageDirectory, "en.json"), "utf8")) as {
      workshop?: Record<string, unknown>;
    };

    for (const key of ["installDialog", "continueInstall", "confirmInstallTitle", "backToWidget", "inspectCss"]) {
      expect(messages.workshop).not.toHaveProperty(key);
    }
  });
});
