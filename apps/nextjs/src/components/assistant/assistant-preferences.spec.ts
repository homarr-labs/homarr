import { describe, expect, test } from "vitest";

import { resolveAssistantPreferenceModelId } from "./assistant-preferences";

const models = [
  { id: "provider/default", name: "Default", inputModalities: ["text"] },
  { id: "provider/alternate", name: "Alternate", inputModalities: ["text"] },
];

describe("resolveAssistantPreferenceModelId", () => {
  test("uses the server default when preferences first load", () => {
    expect(
      resolveAssistantPreferenceModelId({
        currentModelId: null,
        previousDefaultModelId: undefined,
        defaultModelId: "provider/default",
        models,
      }),
    ).toBe("provider/default");
  });

  test("adopts a changed server default even when the old model remains available", () => {
    expect(
      resolveAssistantPreferenceModelId({
        currentModelId: "provider/default",
        previousDefaultModelId: "provider/default",
        defaultModelId: "provider/alternate",
        models,
      }),
    ).toBe("provider/alternate");
  });

  test("preserves an available conversation selection while the default is unchanged", () => {
    expect(
      resolveAssistantPreferenceModelId({
        currentModelId: "provider/alternate",
        previousDefaultModelId: "provider/default",
        defaultModelId: "provider/default",
        models,
      }),
    ).toBe("provider/alternate");
  });

  test("falls back to the default when the selected model is no longer available", () => {
    expect(
      resolveAssistantPreferenceModelId({
        currentModelId: "provider/removed",
        previousDefaultModelId: "provider/default",
        defaultModelId: "provider/default",
        models,
      }),
    ).toBe("provider/default");
  });
});
