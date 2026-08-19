export type ResponseContractParser<TResult> = (response: { json: () => Promise<unknown> }) => Promise<TResult>;

export interface ResponseContractFixture<TResult> {
  name: string;
  payload: unknown;
  expected?: TResult;
  rejects?: true;
}

/**
 * Runs JSON-like fixtures through the same parser used by an integration.
 * This keeps contribution fixtures transport-free and deterministic while
 * still exercising schema validation and response mapping.
 */
export const simulateResponseContractAsync = async <TParsed, TResult = TParsed>(
  parser: ResponseContractParser<TParsed>,
  fixtures: readonly ResponseContractFixture<TResult>[],
  map: (parsed: TParsed) => TResult = (parsed) => parsed as unknown as TResult,
) => {
  const results: { name: string; passed: boolean; message?: string }[] = [];

  for (const fixture of fixtures) {
    try {
      const parsed = await parser({ json: () => Promise.resolve(structuredClone(fixture.payload)) });
      if (fixture.rejects) {
        results.push({
          name: fixture.name,
          passed: false,
          message: "Expected parser rejection, but parsing succeeded.",
        });
        continue;
      }
      const actual = map(parsed);
      const passed = "expected" in fixture ? isDeepStrictEqual(actual, fixture.expected) : true;
      results.push({
        name: fixture.name,
        passed,
        message: passed ? undefined : "Parsed output did not match expected.",
      });
    } catch (error) {
      results.push({
        name: fixture.name,
        passed: fixture.rejects === true,
        message: fixture.rejects ? undefined : error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
};
import { isDeepStrictEqual } from "node:util";
