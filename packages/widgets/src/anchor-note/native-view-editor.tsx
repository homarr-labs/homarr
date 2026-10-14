"use client";

import type { ComponentProps } from "react";
import type ReactQuill from "react-quill-new";

const quillModules = {
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ header: [1, 2, 3, 4, false] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
  history: {
    delay: 1000,
    maxStack: 200,
    userOnly: true,
  },
};

const readOnlyModules = {
  toolbar: false,
};

const quillFormats = [
  "bold",
  "italic",
  "underline",
  "strike",
  "header",
  "align",
  "list",
  "indent",
  "blockquote",
  "code-block",
  "link",
];

export interface AnchorNoteEditorViewProps {
  editorComponent: typeof ReactQuill;
  value: ComponentProps<typeof ReactQuill>["value"];
  readOnly: boolean;
  placeholder: string;
  onChange: NonNullable<ComponentProps<typeof ReactQuill>["onChange"]>;
}

export function AnchorNoteEditorView({
  editorComponent: Editor,
  value,
  readOnly,
  placeholder,
  onChange,
}: AnchorNoteEditorViewProps) {
  return (
    <Editor
      theme="snow"
      readOnly={readOnly}
      value={value}
      onChange={onChange}
      modules={readOnly ? readOnlyModules : quillModules}
      formats={quillFormats}
      placeholder={placeholder}
    />
  );
}
