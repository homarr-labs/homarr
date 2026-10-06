// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { getSessionQueryScope, SessionQueryScopeGuard } from "./session-query-scope";

describe("getSessionQueryScope", () => {
  it("is stable when permission order changes", () => {
    expect(getSessionQueryScope({ user: { id: "user-a", permissions: ["board-view", "integration-use"] } })).toBe(
      getSessionQueryScope({ user: { id: "user-a", permissions: ["integration-use", "board-view"] } }),
    );
  });

  it("changes for a different user or permission set", () => {
    const original = getSessionQueryScope({ user: { id: "user-a", permissions: ["board-view"] } });

    expect(getSessionQueryScope({ user: { id: "user-b", permissions: ["board-view"] } })).not.toBe(original);
    expect(getSessionQueryScope({ user: { id: "user-a", permissions: [] } })).not.toBe(original);
    expect(getSessionQueryScope(null)).toBeNull();
  });

  it("removes the previous session subtree before requesting a document reload", async () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    const onScopeChange = vi.fn();
    const renderScope = async (currentScope: string) => {
      await act(async () => {
        root.render(
          createElement(
            SessionQueryScopeGuard,
            { currentScope, initialScope: "a", onScopeChange },
            createElement("span", null, "session-a-secret"),
          ),
        );
      });
    };

    try {
      await renderScope("a");
      expect(host.textContent).toBe("session-a-secret");

      await renderScope("b");
      expect(host.textContent).not.toContain("session-a-secret");
      expect(host.querySelector('[role="status"]')?.getAttribute("aria-busy")).toBe("true");
      expect(onScopeChange).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
    }
  });
});
