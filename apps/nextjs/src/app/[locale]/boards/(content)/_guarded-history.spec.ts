import { beforeEach, describe, expect, test, vi } from "vitest";

import { classifyGuardedNavigation, removeGuardHistoryEntry, replaceGuardedSameDocumentUrl } from "./_guarded-history";

describe("guarded board edit history", () => {
  beforeEach(() => {
    window.history.replaceState({ page: "board" }, "", "/boards/demo");
  });

  test("replaces the guard entry for same-document fragment navigation", () => {
    const section = document.createElement("section");
    section.id = "Media requests";
    document.body.appendChild(section);
    const scrollIntoView = vi.fn();
    Object.defineProperty(section, "scrollIntoView", { value: scrollIntoView });

    replaceGuardedSameDocumentUrl(new URL("/boards/demo#Media%20requests", window.location.href), {
      key: "__guard",
      id: "guard-id",
    });

    expect(window.location.hash).toBe("#Media%20requests");
    expect(window.history.state).toStrictEqual({
      page: "board",
      __guard: "guard-id",
    });
    expect(scrollIntoView).toHaveBeenCalledOnce();
    section.remove();
  });

  test("treats an explicit empty fragment as same-document navigation", () => {
    const current = new URL(window.location.href);
    const destination = new URL("#", current);

    expect(classifyGuardedNavigation(destination, current)).toBe("same-document");
  });

  test("removes the guard while preserving the fragment when editing ends", () => {
    window.history.replaceState({ page: "board", __guard: "guard-id" }, "", "/boards/demo#section");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {
      window.history.replaceState({ page: "board" }, "", "/boards/demo");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    removeGuardHistoryEntry("http://localhost:3000/boards/demo#section", "__guard");

    expect(back).toHaveBeenCalledOnce();
    expect(window.location.href).toBe("http://localhost:3000/boards/demo#section");
    expect(window.history.state).toStrictEqual({ page: "board" });
  });
});
