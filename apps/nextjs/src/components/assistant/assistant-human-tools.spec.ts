import { describe, expect, test } from "vitest";

import { appManageSchema } from "@homarr/validation/app";

import { hasCompleteAssistantToolArguments } from "./assistant-human-tool-status";
import { getAssistantAppFormValues } from "./assistant-human-tools";

describe("assistant human tool forms", () => {
  test("keeps every human tool in its loading state while arguments are streaming", () => {
    expect(hasCompleteAssistantToolArguments({ type: "running" })).toBe(false);
    expect(hasCompleteAssistantToolArguments({ type: "complete" })).toBe(true);
    expect(hasCompleteAssistantToolArguments({ type: "requires-action", reason: "interrupt" })).toBe(true);
  });

  test("waits for streamed app arguments before initializing the form", () => {
    expect(
      getAssistantAppFormValues(
        { name: "Wiki" },
        {
          type: "running",
        },
      ),
    ).toBeNull();
  });

  test("initializes the native app form with every completed tool argument", () => {
    const values = getAssistantAppFormValues(
      {
        name: "Wikipedia",
        description: "The Free Encyclopedia",
        iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/wikipedia.svg",
        href: "https://wikipedia.org",
        pingUrl: "https://wikipedia.org",
      },
      { type: "complete" },
    );

    expect(values).toEqual({
      name: "Wikipedia",
      description: "The Free Encyclopedia",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/wikipedia.svg",
      href: "https://wikipedia.org",
      pingUrl: "https://wikipedia.org",
    });
    expect(appManageSchema.safeParse(values).success).toBe(true);
  });

  test("drops unusable icon identifiers while preserving the other app fields", () => {
    expect(
      getAssistantAppFormValues(
        {
          name: "Wikipedia",
          iconUrl: "wikipedia",
          href: "https://wikipedia.org",
        },
        { type: "complete" },
      ),
    ).toMatchObject({
      name: "Wikipedia",
      iconUrl: "",
      href: "https://wikipedia.org",
    });
  });
});
