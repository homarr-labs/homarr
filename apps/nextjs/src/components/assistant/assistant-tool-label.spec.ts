import { describe, expect, test } from "vitest";

import { getAssistantIconSearchQuery } from "./assistant-tool-label";

describe("getAssistantIconSearchQuery", () => {
  test("extracts and trims the streamed icon search target", () => {
    expect(getAssistantIconSearchQuery("icon_findIcons", { searchText: "  homarr  " })).toBe("homarr");
  });

  test("distinguishes browsing all icons from unrelated tools", () => {
    expect(getAssistantIconSearchQuery("icon_findIcons", {})).toBe("");
    expect(getAssistantIconSearchQuery("app_create", { searchText: "homarr" })).toBeNull();
  });
});
