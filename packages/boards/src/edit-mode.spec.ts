import { describe, expect, test, vi } from "vitest";

import type { BoardEditAction, BoardEditActionEvent } from "./edit-mode";
import { boardEditActionEventName, requestBoardEditAction } from "./edit-mode";

describe("requestBoardEditAction", () => {
  test("runs the action immediately when no edit guard is mounted", () => {
    const action = vi.fn();

    requestBoardEditAction(action);

    expect(action).toHaveBeenCalledOnce();
  });

  test("lets an edit guard defer the action until the user confirms", () => {
    const action = vi.fn();
    let deferredAction: BoardEditAction | undefined;
    const listener = (event: Event) => {
      event.preventDefault();
      deferredAction = (event as BoardEditActionEvent).detail.action;
    };
    document.addEventListener(boardEditActionEventName, listener, { once: true });

    requestBoardEditAction(action);
    expect(action).not.toHaveBeenCalled();

    void deferredAction?.();
    expect(action).toHaveBeenCalledOnce();
  });
});
