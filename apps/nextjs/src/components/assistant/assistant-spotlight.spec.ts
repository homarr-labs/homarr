import { describe, expect, it, vi } from "vitest";

import { createAssistantPromptInteraction } from "./assistant-spotlight";

describe("createAssistantPromptInteraction", () => {
  it("keeps Spotlight open when the prompt is empty", () => {
    const sendPrompt = vi.fn();
    const interaction = createAssistantPromptInteraction({ sendPrompt });
    const [action] = interaction.useActions({}, "   ");
    expect(action).toBeDefined();
    if (!action) return;
    const sendInteraction = action.useInteraction();

    expect(sendInteraction.type).toBe("javaScript");
    if (sendInteraction.type !== "javaScript") return;

    sendInteraction.onSelect();
    expect(sendInteraction.closeSpotlightOnTrigger).toBe(false);
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it("trims and sends a prompt in the background", () => {
    const sendPrompt = vi.fn();
    const interaction = createAssistantPromptInteraction({ sendPrompt });
    const [action] = interaction.useActions({}, "  Check my services  ");
    expect(action).toBeDefined();
    if (!action) return;
    const sendInteraction = action.useInteraction();

    expect(sendInteraction.type).toBe("javaScript");
    if (sendInteraction.type !== "javaScript") return;

    sendInteraction.onSelect();
    expect(sendInteraction.closeSpotlightOnTrigger).toBe(true);
    expect(sendPrompt).toHaveBeenCalledWith("Check my services");
  });
});
