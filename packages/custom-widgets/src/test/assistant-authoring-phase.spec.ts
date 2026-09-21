import { describe, expect, test } from "vitest";

import { hasCustomWidgetAuthoringLifecycleResumeIntent } from "../core/assistant-authoring-phase";

describe("Custom Widget lifecycle resume intent", () => {
  test.each([
    "Continue",
    "Keep going",
    "I completed the secure source configuration",
    "The setup is done",
    "Change it to use a compact header",
    "The header should be blue",
    "I want it more compact",
    "Could it show six items?",
    "Make it purple",
    "Add a latency chart to my custom widget",
    "Remove the footer from the widget",
    "Add a weekly meal-plan request and show its next three meals",
  ])("resumes accepted lifecycle work for: %s", (text) => {
    expect(hasCustomWidgetAuthoringLifecycleResumeIntent(text, true)).toBe(true);
  });

  test.each([
    "Create a new custom widget for Mealie",
    "Build another Frigate widget",
    "I want a widget for Karakeep",
    "Add another custom widget for RomM",
    "Continue, then create another widget for TubeArchivist",
  ])("starts a clean lifecycle for: %s", (text) => {
    expect(hasCustomWidgetAuthoringLifecycleResumeIntent(text, true)).toBe(false);
  });

  test("does not restore lifecycle state without recent Custom Widget work", () => {
    expect(hasCustomWidgetAuthoringLifecycleResumeIntent("Continue", false)).toBe(false);
    expect(hasCustomWidgetAuthoringLifecycleResumeIntent("Change it to use a compact header", false)).toBe(false);
  });

  test.each(["Add an app to my dashboard", "Show my integrations", "Update Homarr"])(
    "does not treat an unrelated command as an implicit widget follow-up: %s",
    (text) => {
      expect(hasCustomWidgetAuthoringLifecycleResumeIntent(text, true)).toBe(false);
    },
  );
});
