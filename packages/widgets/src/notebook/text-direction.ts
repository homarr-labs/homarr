import { Extension } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

export type TextDirection = "ltr" | "rtl";

export const NotebookTextDirection = Extension.create({
  name: "notebookTextDirection",

  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => element.getAttribute("dir"),
            renderHTML: ({ dir }: { dir?: TextDirection }) => (dir ? { dir } : {}),
          },
        },
      },
    ];
  },
});

export function setTextDirection(editor: Editor, direction: TextDirection) {
  const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
  return editor.chain().focus().updateAttributes(nodeType, { dir: direction });
}
