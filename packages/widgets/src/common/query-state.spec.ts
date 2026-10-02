import { describe, expect, test } from "vitest";

import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "./query-state";

describe("getUsableWidgetQueryData", () => {
  test.each([[], null, 0, false, ""])("preserves successful empty value %#", (data) => {
    expect(getUsableWidgetQueryData({ data, error: null })).toBe(data);
  });

  test("preserves stale cached data when a refetch fails", () => {
    const data = [{ id: "healthy" }];
    expect(getUsableWidgetQueryData({ data, error: new Error("offline") })).toBe(data);
  });

  test("throws access-denied refetches instead of rendering stale cached data", () => {
    const error = { data: { code: "FORBIDDEN" } };
    expect(() => getUsableWidgetQueryData({ data: [{ id: "revoked" }], error })).toThrow(error);
  });

  test("throws a terminal failure when no usable data exists", () => {
    const error = new Error("offline");
    expect(() => getUsableWidgetQueryData({ data: undefined, error })).toThrow(error);
  });

  test("keeps the initial pending state when neither data nor an error exists", () => {
    expect(getUsableWidgetQueryData({ data: undefined, error: null })).toBeUndefined();
  });
});

describe("isInitialWidgetQueryPending", () => {
  test("only marks the unresolved first request as initial pending", () => {
    expect(isInitialWidgetQueryPending({ data: undefined, error: null, isPending: true })).toBe(true);
    expect(isInitialWidgetQueryPending({ data: [], error: null, isPending: true })).toBe(false);
    expect(isInitialWidgetQueryPending({ data: undefined, error: new Error("offline"), isPending: true })).toBe(false);
  });
});
