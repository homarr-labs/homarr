import { describe, expect, it } from "vitest";

import { localeConfigurations } from "./config";
import { supportedLanguages } from "./languages";

describe("supported translation languages", () => {
  it("matches the locale configuration registry", () => {
    expect(Object.keys(localeConfigurations)).toEqual([...supportedLanguages]);
  });
});
