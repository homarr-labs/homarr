import { describe, expect, it } from "vitest";

import { supportsAdvancedFocus } from "../definition";
import { definition } from ".";

describe("assistant widget definition", () => {
  it("stays compact without an explicit advanced-focus opt-in", () => {
    expect(supportsAdvancedFocus(definition)).toBe(false);
  });

  it("follows the current conversation by default", () => {
    const options = definition.createOptions();

    expect(options.conversationMode.defaultValue).toBe("current");
    expect(options.conversation.shouldHide?.({ conversationMode: "current", conversation: null }, [])).toBe(true);
  });

  it("reveals the conversation selector only when a conversation is pinned", () => {
    const options = definition.createOptions();

    expect(options.conversation.shouldHide?.({ conversationMode: "pinned", conversation: null }, [])).toBe(false);
  });
});
