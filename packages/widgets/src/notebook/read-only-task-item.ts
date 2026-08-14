import type { NodeViewRenderer } from "@tiptap/core";
import { TaskItem } from "@tiptap/extension-task-item";
import type { TaskItemOptions } from "@tiptap/extension-task-item";
import type { EditorState, Transaction } from "@tiptap/pm/state";

interface ReadOnlyTaskItemOptions extends TaskItemOptions {
  onReadOnlyCheckedAtPosition?: (position: number, checked: boolean) => void;
}

export const ReadOnlyTaskItem = TaskItem.extend<ReadOnlyTaskItemOptions>({
  addOptions() {
    const parentOptions = this.parent?.();
    return {
      onReadOnlyChecked: parentOptions?.onReadOnlyChecked,
      nested: parentOptions?.nested ?? false,
      HTMLAttributes: parentOptions?.HTMLAttributes ?? {},
      taskListTypeName: parentOptions?.taskListTypeName ?? "taskList",
      a11y: parentOptions?.a11y,
      onReadOnlyCheckedAtPosition: undefined,
    };
  },
  addNodeView() {
    const parentNodeView = this.parent?.() as NodeViewRenderer | undefined;
    if (!parentNodeView) return null;

    return (props) => {
      const nodeView = parentNodeView(props);
      const checkbox =
        nodeView.dom instanceof HTMLElement
          ? nodeView.dom.querySelector<HTMLInputElement>('input[type="checkbox"]')
          : null;
      if (!checkbox) return nodeView;

      const handleChange = () => {
        if (props.editor.isEditable) return;
        const position = props.getPos();
        if (typeof position !== "number") return;
        this.options.onReadOnlyCheckedAtPosition?.(position, checkbox.checked);
      };
      checkbox.addEventListener("change", handleChange);
      const destroyParent = nodeView.destroy?.bind(nodeView);

      return {
        ...nodeView,
        destroy() {
          checkbox.removeEventListener("change", handleChange);
          destroyParent?.();
        },
      };
    };
  },
});

export const createReadOnlyTaskItemTransaction = (
  state: EditorState,
  position: number,
  checked: boolean,
): Transaction | null => {
  const taskItem = state.doc.nodeAt(position);
  if (taskItem?.type.name !== "taskItem") return null;

  return state.tr.setNodeMarkup(position, undefined, {
    ...taskItem.attrs,
    checked,
  });
};
