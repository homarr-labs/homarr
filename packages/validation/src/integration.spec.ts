import { describe, expect, test } from "vitest";

import { integrationCreateFieldsSchema, integrationCreateSchema, requiresInsecureHttpOptIn } from "./integration";

const binderyInput = {
  name: "Bindery",
  url: "http://bindery:8787",
  kind: "bindery",
  secrets: [{ kind: "apiKey", value: "test-key" }],
  attemptSearchEngineCreation: false,
};

test("new integration form can derive fields without kind and app", () => {
  const formSchema = integrationCreateFieldsSchema.omit({ kind: true, app: true });
  expect(
    formSchema.safeParse({
      name: "Bindery",
      url: "http://bindery:8787",
      secrets: [{ kind: "apiKey", value: "test-key" }],
      attemptSearchEngineCreation: false,
    }).success,
  ).toBe(true);
});

describe("integrationCreateSchema HTTP opt-in", () => {
  test("requires an explicit opt-in for HTTP Bindery URLs", () => {
    expect(integrationCreateSchema.safeParse(binderyInput).success).toBe(false);
  });

  test("accepts HTTP Bindery URLs when explicitly allowed", () => {
    expect(integrationCreateSchema.safeParse({ ...binderyInput, allowInsecureHttp: true }).success).toBe(true);
  });

  test("accepts HTTPS Bindery URLs without an opt-in", () => {
    expect(integrationCreateSchema.safeParse({ ...binderyInput, url: "https://bindery:8787" }).success).toBe(true);
  });

  test("preserves HTTP URLs for other integration kinds", () => {
    expect(integrationCreateSchema.safeParse({ ...binderyInput, kind: "radarr" }).success).toBe(true);
  });

  test("requires opt-in only for HTTP Bindery URLs", () => {
    expect(requiresInsecureHttpOptIn("bindery", "http://bindery:8787")).toBe(true);
    expect(requiresInsecureHttpOptIn("bindery", "https://bindery:8787")).toBe(false);
    expect(requiresInsecureHttpOptIn("radarr", "http://radarr:7878")).toBe(false);
  });
});
