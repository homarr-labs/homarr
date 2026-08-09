import { Editor } from "@tiptap/core";
import { TaskList } from "@tiptap/extension-task-list";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { createReadOnlyTaskItemTransaction, ReadOnlyTaskItem } from "./read-only-task-item";

const schema = new Schema({
  nodes: {
    doc: { content: "taskList" },
    paragraph: { content: "text*" },
    text: { inline: true },
    taskList: { content: "taskItem+" },
    taskItem: {
      attrs: { checked: { default: false } },
      content: "paragraph",
    },
  },
});

const createTaskItem = () =>
  schema.node("taskItem", { checked: false }, [schema.node("paragraph", null, [schema.text("Duplicate task")])]);

describe("read-only task item updates", () => {
  it("reports the exact position of the clicked duplicate task", () => {
    const element = document.createElement("div");
    let clickedPosition: number | undefined;
    const editor = new Editor({
      element,
      editable: false,
      extensions: [
        StarterKit,
        TaskList.configure({ itemTypeName: "taskItem" }),
        ReadOnlyTaskItem.configure({
          nested: true,
          onReadOnlyChecked: () => true,
          onReadOnlyCheckedAtPosition: (position) => {
            clickedPosition = position;
          },
        }),
      ],
      content: {
        type: "doc",
        content: [
          {
            type: "taskList",
            content: [
              { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [] }] },
              { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [] }] },
            ],
          },
        ],
      },
    });

    try {
      const positions: number[] = [];
      editor.state.doc.descendants((node, position) => {
        if (node.type.name === "taskItem") positions.push(position);
      });
      const secondPosition = positions[1];
      const secondCheckbox = element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').item(1);
      if (secondPosition === undefined || !secondCheckbox) throw new Error("Expected a second task item checkbox");

      secondCheckbox.checked = true;
      secondCheckbox.dispatchEvent(new Event("change", { bubbles: true }));

      expect(clickedPosition).toBe(secondPosition);
    } finally {
      editor.destroy();
    }
  });

  it("updates the selected position when task items are structurally identical", () => {
    const doc = schema.node("doc", null, [schema.node("taskList", null, [createTaskItem(), createTaskItem()])]);
    const taskItemPositions: number[] = [];
    doc.descendants((node, position) => {
      if (node.type.name === "taskItem") taskItemPositions.push(position);
    });
    const secondTaskItemPosition = taskItemPositions[1];
    if (secondTaskItemPosition === undefined) throw new Error("Expected a second task item");

    const state = EditorState.create({ doc });
    const transaction = createReadOnlyTaskItemTransaction(state, secondTaskItemPosition, true);
    if (!transaction) throw new Error("Expected a task-item transaction");
    const nextState = state.apply(transaction);
    const checkedStates: boolean[] = [];
    nextState.doc.descendants((node) => {
      if (node.type.name === "taskItem") checkedStates.push(Boolean(node.attrs.checked));
    });

    expect(checkedStates).toEqual([false, true]);
  });
});
