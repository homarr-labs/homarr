import { describe, expect, test } from "vitest";

import { boardLayoutSchema } from "./board";

describe("board layout gutters", () => {
  test("defaults both gutters to disabled", () => {
    expect(
      boardLayoutSchema.parse({
        id: "layout",
        name: "Base",
        columnCount: 12,
        breakpoint: 0,
        role: "base",
      }),
    ).toMatchObject({
      leftGutterColumnCount: 0,
      rightGutterColumnCount: 0,
    });
  });

  test("allows up to three columns per gutter while preserving a main column", () => {
    expect(
      boardLayoutSchema.safeParse({
        id: "layout",
        name: "Base",
        columnCount: 6,
        leftGutterColumnCount: 3,
        rightGutterColumnCount: 2,
        breakpoint: 0,
        role: "base",
      }).success,
    ).toBe(true);
    expect(
      boardLayoutSchema.safeParse({
        id: "layout",
        name: "Base",
        columnCount: 6,
        leftGutterColumnCount: 3,
        rightGutterColumnCount: 3,
        breakpoint: 0,
        role: "base",
      }).success,
    ).toBe(false);
  });
});
