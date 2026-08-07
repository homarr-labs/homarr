import { describe, expect, test } from "vitest";

import { orderMessagesByParent } from "../assistant-message-order";

const message = (id: string, parentId: string | null) => ({ id, parentId });

describe("orderMessagesByParent", () => {
  test("keeps an already correct order untouched", () => {
    const messages = [message("a", null), message("b", "a"), message("c", "b")];

    expect(orderMessagesByParent(messages).map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  test("moves a child that the database returned before its parent", () => {
    // Happens when created_at ties on MySQL/SQLite, which store whole seconds only.
    const messages = [message("c", "b"), message("a", null), message("b", "a")];

    expect(orderMessagesByParent(messages).map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  test("preserves sibling order from the incoming list", () => {
    const messages = [message("root", null), message("first", "root"), message("second", "root")];

    expect(orderMessagesByParent(messages).map((entry) => entry.id)).toEqual(["root", "first", "second"]);
  });

  test("keeps branches grouped under their parent", () => {
    const messages = [
      message("root", null),
      message("branch-a", "root"),
      message("branch-b", "root"),
      message("branch-a-child", "branch-a"),
    ];

    expect(orderMessagesByParent(messages).map((entry) => entry.id)).toEqual([
      "root",
      "branch-a",
      "branch-a-child",
      "branch-b",
    ]);
  });

  test("treats a dangling parent reference as a root instead of dropping the message", () => {
    const messages = [message("orphan", "deleted-parent"), message("root", null)];

    expect(orderMessagesByParent(messages).map((entry) => entry.id)).toEqual(["orphan", "root"]);
  });

  test("does not lose messages that form a cycle", () => {
    const messages = [message("a", "b"), message("b", "a")];

    expect(
      orderMessagesByParent(messages)
        .map((entry) => entry.id)
        .toSorted(),
    ).toEqual(["a", "b"]);
  });

  test("keeps a child of a cycle behind its parent", () => {
    // `child` hangs off the cycle a -> b -> a. Only the cycle's own back-edge can break the
    // parent-before-child contract; `child` must still come after `a`.
    const messages = [message("child", "a"), message("a", "b"), message("b", "a")];

    const ordered = orderMessagesByParent(messages).map((entry) => entry.id);

    expect(ordered.toSorted()).toEqual(["a", "b", "child"]);
    expect(ordered.indexOf("a")).toBeLessThan(ordered.indexOf("child"));
  });

  test("handles a chain deeper than the call stack", () => {
    // `getThread` loads every message in a thread, and a conversation is one long parent chain, so
    // a recursive walk would blow the stack on a long thread.
    const depth = 50_000;
    const messages = Array.from({ length: depth }, (_, index) =>
      message(`m${index}`, index === 0 ? null : `m${index - 1}`),
    );

    const ordered = orderMessagesByParent(messages);

    expect(ordered).toHaveLength(depth);
    expect(ordered[0]?.id).toBe("m0");
    expect(ordered[depth - 1]?.id).toBe(`m${depth - 1}`);
  });

  test("returns short lists unchanged", () => {
    expect(orderMessagesByParent([])).toEqual([]);
    expect(orderMessagesByParent([message("only", null)]).map((entry) => entry.id)).toEqual(["only"]);
  });
});
