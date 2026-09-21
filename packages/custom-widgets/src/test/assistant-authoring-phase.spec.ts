import { describe, expect, test } from "vitest";

import { hasCustomWidgetAuthoringLifecycleResumeIntent } from "../core/assistant-authoring-phase";

describe("Custom Widget lifecycle resume intent", () => {
  test.each([
    "Continue",
    "Keep going",
    "I completed the secure source configuration",
    "The setup is done",
    "Change it to use a compact header",
    "Make it purple",
    "Add a latency chart to my custom widget",
    "Remove the footer from the widget",
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
});
