import { describe, expect, test } from "vitest";

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

  test("only preserves usable app icon URLs", () => {
    expect(normalizeAssistantAppIconUrl("youtube")).toBe("");
    expect(normalizeAssistantAppIconUrl("/api/media/youtube.svg")).toBe("/api/media/youtube.svg");
    expect(normalizeAssistantAppIconUrl("https://icons.example/youtube.svg")).toBe("https://icons.example/youtube.svg");
  });
});
