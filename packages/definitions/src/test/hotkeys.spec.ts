import { describe, expect, it } from "vitest";

import { hotkeys } from "../hotkeys";

describe("hotkeys", () => {
  it("uses the discoverable assistant shortcut", () => {
    expect(hotkeys.openAssistant).toBe("shift+a");
  });
});
