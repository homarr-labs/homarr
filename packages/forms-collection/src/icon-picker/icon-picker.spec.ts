import { describe, expect, test } from "vitest";

import { isDirectIconUrl } from "./icon-url";

describe("isDirectIconUrl", () => {
  test.each([
    { value: "https://cdn.example.com/shopify.svg", expected: true },
    { value: "HTTP://cdn.example.com/shopify.svg", expected: true },
    { value: "shopify", expected: false },
    { value: "/icons/shopify.svg", expected: false },
  ])("returns $expected for $value", ({ value, expected }) => {
    expect(isDirectIconUrl(value)).toBe(expected);
  });
});
