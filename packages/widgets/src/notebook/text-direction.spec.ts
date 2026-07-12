import { Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { NotebookTextDirection, setTextDirection } from "./text-direction";

describe("notebook text direction", () => {
  it("persists right-to-left direction in the notebook HTML", () => {
    const editor = new Editor({
      content: "<p>יש לי 16GB</p>",
      extensions: [StarterKit, NotebookTextDirection],
    });

    setTextDirection(editor, "rtl").run();

    expect(editor.getHTML()).toBe('<p dir="rtl">יש לי 16GB</p>');
    editor.destroy();
  });

  it("reads and changes an existing direction attribute", () => {
    const editor = new Editor({
      content: '<h2 dir="rtl">Heading</h2>',
      extensions: [StarterKit, NotebookTextDirection],
    });

    expect(editor.getHTML()).toBe('<h2 dir="rtl">Heading</h2>');

    editor.commands.setTextSelection(1);
    setTextDirection(editor, "ltr").run();

    expect(editor.getHTML()).toContain('<h2 dir="ltr">Heading</h2>');
    editor.destroy();
  });
});
