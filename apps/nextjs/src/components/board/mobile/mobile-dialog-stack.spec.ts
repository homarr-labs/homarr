import { describe, expect, test } from "vitest";

import { hasOpenDialogOutside } from "./mobile-dialog-stack";

describe("hasOpenDialogOutside", () => {
  test("detects an open child dialog outside the details portal", () => {
    const root = document.createElement("div");
    const details = document.createElement("div");
    const child = document.createElement("div");
    details.setAttribute("role", "dialog");
    child.setAttribute("role", "dialog");
    root.append(details, child);

    expect(hasOpenDialogOutside(details, root)).toBe(true);
  });

  test("ignores hidden and closed dialogs", () => {
    const root = document.createElement("div");
    const details = document.createElement("div");
    const hiddenChild = document.createElement("div");
    details.setAttribute("role", "dialog");
    hiddenChild.setAttribute("role", "dialog");
    hiddenChild.setAttribute("aria-hidden", "true");
    root.append(details, hiddenChild);

    expect(hasOpenDialogOutside(details, root)).toBe(false);
  });

  test("does not treat the current details dialog as nested", () => {
    const details = document.createElement("div");
    details.setAttribute("role", "dialog");

    expect(hasOpenDialogOutside(details, details)).toBe(false);
  });
});
