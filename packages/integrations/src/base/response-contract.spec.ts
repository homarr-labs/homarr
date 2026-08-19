import { describe, expect, test } from "vitest";
import { z } from "zod/v4";

import { simulateResponseContractAsync } from "./response-contract";

const parser = async (response: { json: () => Promise<unknown> }) =>
  z.object({ count: z.number() }).parse(await response.json());

describe("simulateResponseContractAsync", () => {
  test("runs valid, mapped, and rejected payload fixtures", async () => {
    const results = await simulateResponseContractAsync(
      parser,
      [
        { name: "valid response", payload: { count: 2 }, expected: { total: 2 } },
        { name: "invalid response", payload: { count: "two" }, rejects: true },
      ],
      (value) => ({ total: value.count }),
    );

    expect(results).toEqual([
      { name: "valid response", passed: true, message: undefined },
      { name: "invalid response", passed: true, message: undefined },
    ]);
  });

  test("treats a fixture without expected or rejects as a successful parse assertion", async () => {
    const results = await simulateResponseContractAsync(parser, [{ name: "parses only", payload: { count: 5 } }]);

    expect(results).toEqual([{ name: "parses only", passed: true, message: undefined }]);
  });

  test("reports actionable mismatches without throwing away later fixtures", async () => {
    const results = await simulateResponseContractAsync(parser, [
      { name: "wrong output", payload: { count: 2 }, expected: { count: 3 } },
      { name: "unexpected success", payload: { count: 4 }, rejects: true },
    ]);

    expect(results).toEqual([
      { name: "wrong output", passed: false, message: "Parsed output did not match expected." },
      { name: "unexpected success", passed: false, message: "Expected parser rejection, but parsing succeeded." },
    ]);
  });
});
