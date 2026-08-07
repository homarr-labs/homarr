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

  test("returns short lists unchanged", () => {
    expect(orderMessagesByParent([])).toEqual([]);
    expect(orderMessagesByParent([message("only", null)]).map((entry) => entry.id)).toEqual(["only"]);
  });
});
