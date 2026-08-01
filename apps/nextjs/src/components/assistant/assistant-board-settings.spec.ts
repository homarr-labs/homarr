import { describe, expect, test } from "vitest";

import { getChangedBoardSettings, getCustomCssWarnings } from "./assistant-board-settings";

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
});

describe("getCustomCssWarnings", () => {
  test("detects imported and remote CSS resources", () => {
    expect(getCustomCssWarnings('@import "theme.css"; .item { background: url(https://example.com/a.png); }')).toEqual({
      importsStylesheet: true,
      loadsRemoteResource: true,
    });
  });
});
