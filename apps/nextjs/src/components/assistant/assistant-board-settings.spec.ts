import { describe, expect, test } from "vitest";

import {
  getAssistantBoardSettingsResult,
  getAssistantBoardSettingsDefaultTab,
  getChangedBoardSettings,
  getCustomCssWarnings,
} from "./assistant-board-settings";

describe("getChangedBoardSettings", () => {
  test("returns only changed settings and treats empty nullable values equally", () => {
    expect(
      getChangedBoardSettings(
        { pageTitle: null, primaryColor: "#112233", opacity: 85 },
        { pageTitle: "", primaryColor: "#445566", opacity: 85 },
      ),
    ).toEqual({ primaryColor: "#445566" });
  });

  test("keeps an intentional custom CSS removal", () => {
    expect(getChangedBoardSettings({ customCss: ".item { color: red; }" }, { customCss: "" })).toEqual({
      customCss: "",
    });
  });

  test("builds the exact result used by automatic board approval", () => {
    expect(
      getAssistantBoardSettingsResult(
        "board-1",
        { pageTitle: "Home", primaryColor: "#112233" },
        { pageTitle: "Home", primaryColor: "#445566" },
      ),
    ).toEqual({ id: "board-1", primaryColor: "#445566" });
    expect(getAssistantBoardSettingsResult("board-1", { pageTitle: "Home" }, { pageTitle: "Home" })).toEqual({
      id: "board-1",
      cancelled: true,
    });
  });
});

describe("getCustomCssWarnings", () => {
  test("detects imported and remote CSS resources", () => {
    expect(getCustomCssWarnings('@import "theme.css"; .item { background: url(https://example.com/a.png); }')).toEqual({
      importsStylesheet: true,
      loadsRemoteResource: true,
    });
  });
});

describe("getAssistantBoardSettingsDefaultTab", () => {
  test("opens the tab containing the proposed settings", () => {
    expect(getAssistantBoardSettingsDefaultTab({ pageTitle: "Home" })).toBe("general");
    expect(getAssistantBoardSettingsDefaultTab({ primaryColor: "#112233" })).toBe("appearance");
    expect(getAssistantBoardSettingsDefaultTab({ backgroundImageSize: "cover" })).toBe("background");
    expect(getAssistantBoardSettingsDefaultTab({ customCss: ".item { opacity: 0.9; }" })).toBe("css");
  });
});
