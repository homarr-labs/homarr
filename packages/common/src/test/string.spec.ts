import { describe, expect, test } from "vitest";

import { bestMatch, capitalize } from "../string";

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
