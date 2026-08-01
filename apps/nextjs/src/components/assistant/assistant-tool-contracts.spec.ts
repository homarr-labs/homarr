import { describe, expect, test } from "vitest";
import { z } from "zod/v4";

import { browserToolContracts, normalizeAssistantAppIconUrl } from "./assistant-tool-contracts";

describe("assistant human tool contracts", () => {
  test("accepts a structured question with reusable choices", () => {
    expect(
      browserToolContracts.ask_user.parameters.safeParse({
        question: "How should the app be added?",
        options: [
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
          { id: "alternative", label: "Choose an alternative", description: "Adjust the proposed app first." },
        ],
      }).success,
    ).toBe(true);
  });

  test("rejects questions without enough choices", () => {
    expect(
      browserToolContracts.ask_user.parameters.safeParse({
        question: "Continue?",
        options: [{ id: "yes", label: "Yes" }],
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
  });
});
