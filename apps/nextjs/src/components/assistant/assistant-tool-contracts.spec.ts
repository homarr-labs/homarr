import { describe, expect, test } from "vitest";
import { z } from "zod/v4";

import { browserToolContracts, normalizeAssistantAppIconUrl } from "./assistant-tool-contracts";

const supportedToolArguments = {
  ask_user: {
    question: "How should the app be added?",
    options: [
      { id: "yes", label: "Yes", kind: "affirmative" },
      { id: "no", label: "No", kind: "negative" },
    ],
  },
  configure_app: {
    name: "Wikipedia",
    description: "The Free Encyclopedia",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/wikipedia.svg",
    href: "https://wikipedia.org",
    pingUrl: "https://wikipedia.org",
  },
  configure_board_settings: {
    boardId: "board-1",
    boardName: "Home",
    summary: "Improve dashboard contrast.",
    changes: { primaryColor: "#7C3AED" },
  },
  navigate_to_route: { path: "/manage/apps" },
  open_command_menu: {},
  open_media_request_search: {},
} satisfies Record<keyof typeof browserToolContracts, unknown>;

describe("assistant human tool contracts", () => {
  test("keeps a valid fixture and JSON schema for every supported browser tool", () => {
    expect(Object.keys(supportedToolArguments).toSorted()).toEqual(Object.keys(browserToolContracts).toSorted());

    for (const [toolName, contract] of Object.entries(browserToolContracts)) {
      const args = supportedToolArguments[toolName as keyof typeof supportedToolArguments];
      expect(contract.parameters.safeParse(args).success, toolName).toBe(true);
      expect(() => z.toJSONSchema(contract.parameters), toolName).not.toThrow();
    }
  });

  test("accepts a structured question with reusable choices", () => {
    expect(
      browserToolContracts.ask_user.parameters.safeParse({
        question: "How should the app be added?",
        options: [
          { id: "yes", label: "Yes", kind: "affirmative" },
          { id: "no", label: "No", kind: "negative" },
          {
            id: "alternative",
            label: "Choose an alternative",
            description: "Adjust the proposed app first.",
            kind: "alternative",
          },
        ],
      }).success,
    ).toBe(true);
  });

  test("rejects questions without enough choices", () => {
    expect(
      browserToolContracts.ask_user.parameters.safeParse({
        question: "Continue?",
        options: [{ id: "yes", label: "Yes", kind: "affirmative" }],
      }).success,
    ).toBe(false);
  });

  test("requires every structured choice to declare its category", () => {
    expect(
      browserToolContracts.ask_user.parameters.safeParse({
        question: "Continue?",
        options: [
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ],
      }).success,
    ).toBe(false);
  });

  test("allows partial app defaults for the native form", () => {
    expect(
      browserToolContracts.configure_app.parameters.safeParse({
        name: "YouTube",
        href: "https://youtube.com",
      }).success,
    ).toBe(true);
  });

  test("requires an app name before opening the native form", () => {
    expect(
      browserToolContracts.configure_app.parameters.safeParse({
        iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/wikipedia.svg",
        href: "https://wikipedia.org",
      }).success,
    ).toBe(false);
  });

  test("accepts a scoped board settings proposal", () => {
    expect(
      browserToolContracts.configure_board_settings.parameters.safeParse({
        boardId: "board-1",
        boardName: "Home",
        summary: "Improve dashboard contrast and tighten card spacing.",
        changes: {
          primaryColor: "#7C3AED",
          customCss: ".mantine-Card-root { padding: 0.75rem; }",
        },
      }).success,
    ).toBe(true);
  });

  test("rejects invalid board colors and oversized CSS", () => {
    expect(
      browserToolContracts.configure_board_settings.parameters.safeParse({
        boardId: "board-1",
        boardName: "Home",
        summary: "Change styling",
        changes: { primaryColor: "purple", customCss: "a".repeat(16_385) },
      }).success,
    ).toBe(false);
  });

  test("converts the board review parameters to a provider JSON schema", () => {
    expect(() => z.toJSONSchema(browserToolContracts.configure_board_settings.parameters)).not.toThrow();
  });

  test("only preserves usable app icon URLs", () => {
    expect(normalizeAssistantAppIconUrl("youtube")).toBe("");
    expect(normalizeAssistantAppIconUrl("/api/media/youtube.svg")).toBe("/api/media/youtube.svg");
    expect(normalizeAssistantAppIconUrl("https://icons.example/youtube.svg")).toBe("https://icons.example/youtube.svg");
    expect(normalizeAssistantAppIconUrl("http://icons.example/youtube.svg")).toBe("http://icons.example/youtube.svg");
    expect(normalizeAssistantAppIconUrl("//icons.example/youtube.svg")).toBe("");
    expect(normalizeAssistantAppIconUrl("javascript:alert(1)")).toBe("");
    expect(normalizeAssistantAppIconUrl("data:image/svg+xml,<svg />")).toBe("");
    expect(normalizeAssistantAppIconUrl("file:///etc/passwd")).toBe("");
  });
});
