import { TRPCClientError } from "@trpc/client";
import { describe, expect, test, vi } from "vitest";

import type { TranslationFunction } from "@homarr/translation";
import { createLanguageMapping, translateIfNecessary } from "@homarr/translation";

import { isTennisApiKeyError, shouldRetryTennisQuery } from "./api-key-error";
import { definition } from ".";

const useQueryMock = vi.hoisted(() => vi.fn(() => ({ data: undefined })));

vi.mock("@homarr/api/client", () => ({
  clientApi: { widget: { tennis: { getMatches: { useQuery: useQueryMock } } } },
}));

vi.mock("@homarr/translation/client", () => ({
  useScopedI18n: () => (key: string) => key,
  useI18n: () => (key: string) => key,
}));

const createClientError = (code: string) =>
  new TRPCClientError("Live Tennis request failed", {
    result: { error: { data: { code } } },
  } as never);

describe("isTennisApiKeyError", () => {
  test("detects the UNAUTHORIZED error raised for a missing or rejected API key", () => {
    expect(isTennisApiKeyError(createClientError("UNAUTHORIZED"))).toBe(true);
  });

  test("ignores other tRPC error codes so they keep the inline empty state", () => {
    expect(isTennisApiKeyError(createClientError("INTERNAL_SERVER_ERROR"))).toBe(false);
    expect(isTennisApiKeyError(createClientError("TIMEOUT"))).toBe(false);
  });

  test("ignores transport level failures that carry no error data", () => {
    // `data` is undefined for these, which must not throw while evaluating throwOnError.
    expect(() => isTennisApiKeyError(new TRPCClientError("Failed to fetch"))).not.toThrow();
    expect(isTennisApiKeyError(new TRPCClientError("Failed to fetch"))).toBe(false);
    expect(isTennisApiKeyError(new Error("boom"))).toBe(false);
    expect(isTennisApiKeyError(undefined)).toBe(false);
  });
});

describe("shouldRetryTennisQuery", () => {
  test("does not retry a missing or rejected API key", () => {
    expect(shouldRetryTennisQuery(0, createClientError("UNAUTHORIZED"))).toBe(false);
  });

  test("keeps the default three retries for transient failures", () => {
    const transient = createClientError("INTERNAL_SERVER_ERROR");

    expect(shouldRetryTennisQuery(0, transient)).toBe(true);
    expect(shouldRetryTennisQuery(2, transient)).toBe(true);
    expect(shouldRetryTennisQuery(3, transient)).toBe(false);
  });
});

describe("tennis widget UNAUTHORIZED error state", () => {
  // This asserts the definition entry WidgetError resolves, not the rendered output. Rendering is
  // covered by WidgetError itself, which is shared by every widget.
  test("declares the documented API key configuration message", async () => {
    const enTranslation = await createLanguageMapping().en();
    const t = ((key: string) =>
      key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], {
        widget: enTranslation.default.widget,
      })) as unknown as TranslationFunction;

    // This is the entry WidgetError looks up for a query error with code UNAUTHORIZED.
    const errorState = definition.errors?.UNAUTHORIZED;

    expect(errorState).toBeDefined();
    expect(errorState?.icon).toBeDefined();
    expect(translateIfNecessary(t, errorState?.message)).toBe(
      "No valid Live Tennis API key configured. Set the LIVE_TENNIS_API_KEY environment variable.",
    );
    // The message is self explanatory, so the generic "check logs" link is suppressed.
    expect(errorState?.hideLogsLink).toBe(true);
  });
});
