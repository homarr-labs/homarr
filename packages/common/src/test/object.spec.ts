import { describe, expect, it } from "vitest";

import { objectKeys } from "../object";

describe("objectKeys should return all keys of an object", () => {
  it("should return all keys of an object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(objectKeys(obj)).toEqual(["a", "b", "c"]);
  });
});
