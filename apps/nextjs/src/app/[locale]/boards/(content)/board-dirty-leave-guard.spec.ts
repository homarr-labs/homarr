// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { registerBoardDirtyLeaveGuard } from "./board-dirty-leave-guard";

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.replaceChildren();
  window.history.replaceState(null, "", "/en/boards/home");
});

const appendLink = (href: string, attributes?: Record<string, string>) => {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = "Other board";
  for (const [name, value] of Object.entries(attributes ?? {})) {
    link.setAttribute(name, value);
  }
  document.body.append(link);
  return link;
};

const clickLink = (link: HTMLAnchorElement, init?: MouseEventInit) => {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  link.dispatchEvent(event);
  return event;
};

describe("board dirty leave guard", () => {
  it("asks once when the header mounts the guard twice and still runs the link click handler", () => {
    const firstConfirmLeave = vi.fn();
    const secondConfirmLeave = vi.fn();
    cleanups.push(
      registerBoardDirtyLeaveGuard({ confirmLeave: firstConfirmLeave, guardBeforeUnload: false }),
      registerBoardDirtyLeaveGuard({ confirmLeave: secondConfirmLeave, guardBeforeUnload: false }),
    );
    const link = appendLink("/en/boards/other");
    const linkClick = vi.fn();
    link.addEventListener("click", linkClick);

    const event = clickLink(link);

    expect(event.defaultPrevented).toBe(true);
    expect(firstConfirmLeave).toHaveBeenCalledTimes(1);
    expect(firstConfirmLeave).toHaveBeenCalledWith(link.href);
    expect(secondConfirmLeave).not.toHaveBeenCalled();
    expect(linkClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the guard after the first header copy unmounts", () => {
    const firstConfirmLeave = vi.fn();
    const secondConfirmLeave = vi.fn();
    const removeFirst = registerBoardDirtyLeaveGuard({
      confirmLeave: firstConfirmLeave,
      guardBeforeUnload: false,
    });
    cleanups.push(registerBoardDirtyLeaveGuard({ confirmLeave: secondConfirmLeave, guardBeforeUnload: false }));
    removeFirst();

    const link = appendLink("/en/boards/other");
    clickLink(link);

    expect(firstConfirmLeave).not.toHaveBeenCalled();
    expect(secondConfirmLeave).toHaveBeenCalledTimes(1);
    expect(secondConfirmLeave).toHaveBeenCalledWith(link.href);
  });

  it("ignores modified clicks and links that open in a new tab", () => {
    const confirmLeave = vi.fn();
    cleanups.push(registerBoardDirtyLeaveGuard({ confirmLeave, guardBeforeUnload: false }));
    const modifiedLink = appendLink("/en/boards/other");
    const newTabLink = appendLink("/en/boards/other", { target: "_blank" });

    const modifiedClick = clickLink(modifiedLink, { ctrlKey: true });
    const newTabClick = clickLink(newTabLink);

    expect(modifiedClick.defaultPrevented).toBe(false);
    expect(newTabClick.defaultPrevented).toBe(false);
    expect(confirmLeave).not.toHaveBeenCalled();
  });

  it("locks browser history once while any header copy is mounted", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    cleanups.push(
      registerBoardDirtyLeaveGuard({ confirmLeave: vi.fn(), guardBeforeUnload: true }),
      registerBoardDirtyLeaveGuard({ confirmLeave: vi.fn(), guardBeforeUnload: true }),
    );

    const popStateEvent = new PopStateEvent("popstate", { cancelable: true });
    window.dispatchEvent(popStateEvent);
    const beforeUnloadEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnloadEvent);

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(popStateEvent.defaultPrevented).toBe(true);
    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
  });

  it("stops intercepting navigation after every header copy unmounts", () => {
    const confirmLeave = vi.fn();
    const removeGuard = registerBoardDirtyLeaveGuard({ confirmLeave, guardBeforeUnload: true });
    removeGuard();
    const link = appendLink("/en/boards/other");

    const event = clickLink(link);
    const beforeUnloadEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnloadEvent);

    expect(event.defaultPrevented).toBe(false);
    expect(beforeUnloadEvent.defaultPrevented).toBe(false);
    expect(confirmLeave).not.toHaveBeenCalled();
  });
});
