import { describe, expect, it, vi } from "vitest";

import { createAssistantPromptInteraction } from "./assistant-spotlight";

describe("createAssistantPromptInteraction", () => {
  it("sends an existing default-search query immediately", () => {
    const sendPrompt = vi.fn(() => true);
    const onPromptAccepted = vi.fn();
    const interaction = createAssistantPromptInteraction({
      sendPrompt,
      onPromptAccepted,
      prompt: "  Check my services  ",
    });

    expect(interaction.type).toBe("javaScript");
    if (interaction.type !== "javaScript") return;

    interaction.onSelect();
    expect(interaction.closeSpotlightOnTrigger).toBe(false);
    expect(sendPrompt).toHaveBeenCalledWith("Check my services");
    expect(onPromptAccepted).toHaveBeenCalledOnce();
  });

  it("keeps Spotlight open when the prompt is empty", () => {
    const sendPrompt = vi.fn();
    const onPromptAccepted = vi.fn();
    const interaction = createAssistantPromptInteraction({ sendPrompt, onPromptAccepted });
    expect(interaction.type).toBe("children");
    if (interaction.type !== "children") return;

    const [action] = interaction.useActions({}, "   ");
    expect(action).toBeDefined();
    if (!action) return;
    const sendInteraction = action.useInteraction();

    expect(sendInteraction.type).toBe("javaScript");
    if (sendInteraction.type !== "javaScript") return;

    sendInteraction.onSelect();
    expect(sendInteraction.closeSpotlightOnTrigger).toBe(false);
    expect(sendPrompt).not.toHaveBeenCalled();
    expect(onPromptAccepted).not.toHaveBeenCalled();
  });

  it("trims and sends a prompt in the background", () => {
    const sendPrompt = vi.fn(() => true);
    const onPromptAccepted = vi.fn();
    const interaction = createAssistantPromptInteraction({ sendPrompt, onPromptAccepted });
    expect(interaction.type).toBe("children");
    if (interaction.type !== "children") return;

    const [action] = interaction.useActions({}, "  Check my services  ");
    expect(action).toBeDefined();
    if (!action) return;
    const sendInteraction = action.useInteraction();

    expect(sendInteraction.type).toBe("javaScript");
    if (sendInteraction.type !== "javaScript") return;

    sendInteraction.onSelect();
    expect(sendInteraction.closeSpotlightOnTrigger).toBe(false);
    expect(sendPrompt).toHaveBeenCalledWith("Check my services");
    expect(onPromptAccepted).toHaveBeenCalledOnce();
  });

  it("keeps Spotlight open when the runtime rejects the prompt", () => {
    const sendPrompt = vi.fn(() => false);
    const onPromptAccepted = vi.fn();
    const interaction = createAssistantPromptInteraction({
      sendPrompt,
      onPromptAccepted,
      prompt: "Check my services",
    });
    expect(interaction.type).toBe("javaScript");
    if (interaction.type !== "javaScript") return;

    interaction.onSelect();

    expect(interaction.closeSpotlightOnTrigger).toBe(false);
    expect(sendPrompt).toHaveBeenCalledWith("Check my services");
    expect(onPromptAccepted).not.toHaveBeenCalled();
  });

  it("cannot trigger while the assistant is already handling a request", () => {
    const sendPrompt = vi.fn();
    const interaction = createAssistantPromptInteraction({
      sendPrompt,
      onPromptAccepted: vi.fn(),
      prompt: "Check my services",
      canSend: false,
    });

    expect(interaction).toEqual({ type: "none" });
    expect(sendPrompt).not.toHaveBeenCalled();
  });
});
