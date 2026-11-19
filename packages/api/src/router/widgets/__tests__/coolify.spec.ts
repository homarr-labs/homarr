import { describe, expect, test } from "vitest";

import { getExternalUrl } from "../coolify";

const createIntegration = (input: { externalUrl?: string | null }) => ({
  externalUrl: input.externalUrl ?? null,
});

describe("getExternalUrl", () => {
  test("returns the URL of the linked app", () => {
    expect(getExternalUrl(createIntegration({ externalUrl: "https://coolify.example.com" }))).toBe(
      "https://coolify.example.com",
    );
  });

  test("removes the trailing slash", () => {
    expect(getExternalUrl(createIntegration({ externalUrl: "https://coolify.example.com/" }))).toBe(
      "https://coolify.example.com",
    );
  });

  test("rejects credential bearing and non http URLs", () => {
    expect(getExternalUrl(createIntegration({ externalUrl: "https://user:secret@coolify.example.com" }))).toBeNull();
    expect(getExternalUrl(createIntegration({ externalUrl: "vscode://coolify" }))).toBeNull();
  });

  test("returns null when no app is linked", () => {
    expect(getExternalUrl(createIntegration({}))).toBeNull();
  });
});
