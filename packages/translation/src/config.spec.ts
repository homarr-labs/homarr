import { describe, expect, it } from "vitest";

import { getIntlLocale } from "./config";

describe("getIntlLocale", () => {
  it("maps Homarr-specific locale keys to canonical Intl locales", () => {
    expect(getIntlLocale("cn")).toBe("zh-CN");
    expect(getIntlLocale("zh")).toBe("zh-TW");
    expect(getIntlLocale("cr")).toBe("en");
  });

  it("preserves locale keys that Intl already understands", () => {
    expect(getIntlLocale("fr")).toBe("fr");
    expect(getIntlLocale("de-CH")).toBe("de-CH");
  });
});
