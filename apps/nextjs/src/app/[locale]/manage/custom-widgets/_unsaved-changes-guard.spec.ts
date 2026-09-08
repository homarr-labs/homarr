// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { registerUnsavedChangesGuard } from "./_unsaved-changes-guard";

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.replaceChildren();
  window.history.replaceState(null, "", "/en/manage/custom-widgets/edit/widget-1");
});

describe("custom widget unsaved changes guard", () => {
  it("blocks client-side link navigation and requests confirmation for a dirty form", () => {
    window.history.replaceState(null, "", "/en/manage/custom-widgets/edit/widget-1");
    const confirmNavigation = vi.fn();
    cleanups.push(registerUnsavedChangesGuard({ isDirty: () => true, confirmNavigation }));
    const link = document.createElement("a");
    link.href = "/en/manage/custom-widgets";
    link.textContent = "Custom widgets";
    document.body.append(link);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(confirmNavigation).toHaveBeenCalledWith("/en/manage/custom-widgets");
  });

  it("allows section links and navigation after the form is clean", () => {
    window.history.replaceState(null, "", "/en/manage/custom-widgets/edit/widget-1");
    let dirty = true;
    const confirmNavigation = vi.fn();
    cleanups.push(registerUnsavedChangesGuard({ isDirty: () => dirty, confirmNavigation }));
    const sectionLink = document.createElement("a");
    sectionLink.href = "#sources";
    document.body.append(sectionLink);

    expect(sectionLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }))).toBe(
      true,
    );
    dirty = false;
    const listLink = document.createElement("a");
    listLink.href = "/en/manage/custom-widgets";
    document.body.append(listLink);
    expect(listLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }))).toBe(true);
    expect(confirmNavigation).not.toHaveBeenCalled();
  });

  it("restores the current page and confirms browser history navigation", () => {
    window.history.replaceState(null, "", "/en/manage/custom-widgets");
    window.history.pushState(null, "", "/en/manage/custom-widgets/edit/widget-1");
    const confirmNavigation = vi.fn();
    cleanups.push(registerUnsavedChangesGuard({ isDirty: () => true, confirmNavigation }));

    window.history.replaceState(null, "", "/en/manage/custom-widgets");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(window.location.pathname).toBe("/en/manage/custom-widgets/edit/widget-1");
    expect(confirmNavigation).toHaveBeenCalledWith("/en/manage/custom-widgets");
  });
});
