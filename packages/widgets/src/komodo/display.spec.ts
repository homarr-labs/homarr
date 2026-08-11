import { describe, expect, test } from "vitest";

import { getKomodoStateTranslationKey } from "./display";

describe("getKomodoStateTranslationKey", () => {
  test.each([
    ["Ok", "ok"],
    ["NotOk", "notOk"],
    ["not_deployed", "notDeployed"],
    ["restarting", "restarting"],
  ])("maps %s to %s", (state, expected) => {
    expect(getKomodoStateTranslationKey(state)).toBe(expected);
  });

  test("falls back to unknown for future states", () => {
    expect(getKomodoStateTranslationKey("future_state")).toBe("unknown");
  });
});
