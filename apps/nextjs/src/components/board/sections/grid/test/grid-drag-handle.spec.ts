import { describe, expect, test, vi } from "vitest";

import { observeGridDragHandle } from "../grid-drag-handle";

describe("grid drag handle", () => {
  test("disconnects the observer after binding the first handle", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const bind = vi.fn();

    const cleanup = observeGridDragHandle(container, "[data-drag-handle]", bind);
    expect(bind).not.toHaveBeenCalled();

    container.append(document.createElement("span"));
    await Promise.resolve();
    expect(bind).not.toHaveBeenCalled();

    const handle = document.createElement("button");
    handle.dataset.dragHandle = "";
    container.append(handle);
    await vi.waitFor(() => expect(bind).toHaveBeenCalledOnce());
    expect(bind).toHaveBeenLastCalledWith(handle);

    handle.append(document.createElement("span"));
    container.prepend(document.createElement("button"));
    await Promise.resolve();
    expect(bind).toHaveBeenCalledOnce();

    cleanup();
    expect(bind).toHaveBeenLastCalledWith(null);
    container.remove();
  });
});
