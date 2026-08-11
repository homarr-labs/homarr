import { describe, expect, test } from "vitest";

import { bestMatch, capitalize, getImageMatchRank, normalizeImageName } from "../string";

const capitalizeTestCases = [
  ["hello", "Hello"],
  ["World", "World"],
  ["123", "123"],
  ["a", "A"],
  ["two words", "Two words"],
] as const;

describe("capitalize should capitalize the first letter of a string", () => {
  capitalizeTestCases.forEach(([input, expected]) => {
    test(`should capitalize ${input} to ${expected}`, () => {
      expect(capitalize(input)).toEqual(expected);
    });
  });
});

describe("bestMatch should find the best match in an array of options", () => {
  test("should find exact match for 'nginx'", () => {
    const options = [
      { name: "my-nginx" },
      { name: "nginx-proxy" },
      { name: "nginx" },
      { name: "redis" },
      { name: "postgres" },
    ];

    const result = bestMatch("nginx", options, ({ name }) => name);

    expect(result).toEqual({ name: "nginx" });
  });
  test("should find closest match for 'nginx' when exact match is not available", () => {
    const options = [{ name: "redis" }, { name: "nginx-proxy" }, { name: "my-nginx" }, { name: "postgres" }];

    const result = bestMatch("nginx", options, ({ name }) => name);

    expect(result).toEqual({ name: "nginx-proxy" });
  });
  test("should return null if no match is found", () => {
    const options = [{ name: "redis" }, { name: "postgres" }];

    const result = bestMatch("nginx", options, ({ name }) => name);

    expect(result).toBeNull();
  });
  test("should return null if options array is empty", () => {
    const options: { name: string }[] = [];

    const result = bestMatch("nginx", options, ({ name }) => name);

    expect(result).toBeNull();
  });
});

describe("image name matching", () => {
  test.each([
    ["home-assistant.svg", "home assistant"],
    ["https://example.com/Home_Assistant.PNG?v=1", "home assistant"],
    ["jelly.fin.webp", "jelly fin"],
    ["Caf\u00e9.svg", "cafe"],
    ["\u6771\u4eac.svg", "\u6771\u4eac"],
    ["\u0939\u093f\u0928\u094d\u0926\u0940.svg", "\u0939\u093f\u0928\u094d\u0926\u0940"],
  ])("normalizes %s", (value, expected) => {
    expect(normalizeImageName(value)).toBe(expected);
  });

  test.each([
    ["homeassistant", "home-assistant.svg", 1],
    ["home assistant", "home_assistant.png", 0],
    ["home assistant", "Home Assistant.webp", 0],
    ["\u6771\u4eac", "\u6771\u4eac.svg", 0],
    ["\u0939\u093f\u0928\u094d\u0926\u0940", "\u0939\u093f\u0928\u094d\u0926\u0940.png", 0],
    ["home assistant", "unrelated.svg", null],
  ])("ranks %s against %s", (search, candidate, expected) => {
    expect(getImageMatchRank(normalizeImageName(search), candidate)).toBe(expected);
  });
});
