import { describe, expect, test } from "vitest";

import { appHrefSchema } from "../app";

describe("appHrefSchema", () => {
  test.each([
    ["https://example.com/path", "https://example.com/path"],
    ["http://example.com/path", "http://example.com/path"],
    ["https://example.com", "https://example.com"],
    ["/cockpit/", "/cockpit/"],
    ["/signalk-server/@signalk/freeboard-sk/", "/signalk-server/@signalk/freeboard-sk/"],
    ["/x", "/x"],
  ])("accepts %s", (input, expected) => {
    expect(appHrefSchema.parse(input)).toBe(expected);
  });

  test("transforms empty string to null", () => {
    expect(appHrefSchema.parse("")).toBeNull();
  });

  test("accepts null", () => {
    expect(appHrefSchema.parse(null)).toBeNull();
  });

  test.each([
    // skipcq: JS-0087 — fixture asserts that javascript: scheme is rejected by the schema
    ["javascript:alert(1)"],
    // skipcq: JS-0087 — fixture asserts that JavaScript: (mixed case) is rejected by the schema
    ["JavaScript:alert(1)"],
    ["//evil.example.com/path"],
    ["/"],
    ["cockpit/"],
    ["not-a-url"],
    ["./relative"],
    ["../relative"],
    // Browser-normalized cross-origin escapes — WHATWG URL parser collapses
    // backslash to forward slash for http(s), so these would navigate
    // off-origin if rendered into <a href>. Reject up front.
    ["/\\evil.example.com/x"],
    ["/\\\\evil.example.com/x"],
    // Whitespace / control characters anywhere in the path.
    ["/foo bar"],
    ["/foo\tbar"],
    ["/foo\nbar"],
    ["/\tfoo"],
    // C0 / C1 controls (invisible).
    ["/foo"],
    ["/foo"],
    ["/foo"],
    ["/foo"],
    // Zero-width / bidi / formatting characters (display-spoofing class).
    ["/​foo"], // ZWSP
    ["/‌foo"], // ZWNJ
    ["/‍foo"], // ZWJ
    ["/‮foo"], // RTL override
    ["/﻿foo"], // BOM
    // Consecutive slashes mid-path.
    ["/foo//bar"],
    ["/cockpit//"],
  ])("rejects %s", (input) => {
    expect(() => appHrefSchema.parse(input)).toThrow();
  });
});
