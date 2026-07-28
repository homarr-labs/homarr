import { afterEach, describe, expect, test, vi } from "vitest";

import { focusMobileBoardSection } from "./mobile-section-navigation";

afterEach(() => {
  document.body.replaceChildren();
});

describe("focusMobileBoardSection", () => {
  test.each([
    [false, "smooth"],
    [true, "auto"],
  ] as const)("scrolls to and focuses the heading (reduced motion: %s)", (reduceMotion, behavior) => {
    const heading = document.createElement("h2");
    heading.id = "section";
    heading.tabIndex = -1;
    heading.scrollIntoView = vi.fn();
    document.body.append(heading);

    expect(focusMobileBoardSection({ anchorId: heading.id, reduceMotion })).toBe(true);
    expect(heading.scrollIntoView).toHaveBeenCalledWith({ behavior, block: "start" });
    expect(document.activeElement).toBe(heading);
  });

  test("does nothing when the section no longer exists", () => {
    expect(focusMobileBoardSection({ anchorId: "missing", reduceMotion: false })).toBe(false);
  });
});
