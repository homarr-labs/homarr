import { describe, expect, test } from "vitest";

import { isEscapeOwnedByNestedOverlay } from "./escape";

describe("isEscapeOwnedByNestedOverlay", () => {
  test("allows Escape from the advanced surface itself", () => {
    const surface = document.createElement("section");
    surface.setAttribute("role", "dialog");
    const button = document.createElement("button");
    surface.append(button);

    expect(isEscapeOwnedByNestedOverlay(button, surface)).toBe(false);
  });

  test("leaves Escape to a nested Mantine modal", () => {
    const surface = document.createElement("section");
    surface.setAttribute("role", "region");
    const modal = document.createElement("section");
    modal.setAttribute("role", "dialog");
    const input = document.createElement("input");
    modal.append(input);

    expect(isEscapeOwnedByNestedOverlay(input, surface)).toBe(true);
  });

  test.each(["menu", "listbox"])("leaves Escape to a nested %s overlay", (role) => {
    const surface = document.createElement("section");
    surface.setAttribute("role", "region");
    const overlay = document.createElement("div");
    overlay.setAttribute("role", role);
    const target = document.createElement("button");
    overlay.append(target);

    expect(isEscapeOwnedByNestedOverlay(target, surface)).toBe(true);
  });

  test("honors Mantine's stop-propagation marker for menus and comboboxes", () => {
    const surface = document.createElement("section");
    surface.setAttribute("role", "region");
    const target = document.createElement("button");
    target.setAttribute("data-mantine-stop-propagation", "true");
    surface.append(target);

    expect(isEscapeOwnedByNestedOverlay(target, surface)).toBe(true);
  });

  test("leaves Escape to a visible portalled menu when focus stays in the advanced surface", () => {
    const surface = document.createElement("section");
    surface.setAttribute("role", "dialog");
    const target = document.createElement("button");
    surface.append(target);
    document.body.append(surface);

    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    menu.getClientRects = () => [{ width: 100, height: 100 }] as unknown as DOMRectList;
    document.body.append(menu);

    expect(isEscapeOwnedByNestedOverlay(target, surface)).toBe(true);

    menu.remove();
    surface.remove();
  });

  test("does not mistake the compact widget source for a nested overlay", () => {
    const surface = document.createElement("section");
    surface.setAttribute("role", "region");
    const source = document.createElement("button");

    expect(isEscapeOwnedByNestedOverlay(source, surface)).toBe(false);
  });
});
