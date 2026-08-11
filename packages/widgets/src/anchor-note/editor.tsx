"use client";

import { useCallback, useMemo } from "react";
import type { ComponentProps } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import type { DeltaStatic } from "react-quill-new";

import type { QuillDelta } from "./content";
import { parseStoredOperations, stringifyDelta } from "./content";

import "react-quill-new/dist/quill.snow.css";

type ReactQuillOnChange = NonNullable<ComponentProps<typeof ReactQuill>["onChange"]>;

const DeltaConstructor = Quill.import("delta") as new (
  ops?: QuillDelta["ops"] | { ops: QuillDelta["ops"] },
) => DeltaStatic;

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

interface AnchorNoteEditorProps {
  content?: string | null;
  readOnly: boolean;
  placeholder: string;
  onChange: (content: string) => void;
}

export default function AnchorNoteEditor({ content, readOnly, placeholder, onChange }: AnchorNoteEditorProps) {
  const value = useMemo(() => new DeltaConstructor(parseStoredOperations(content)), [content]);
  const handleChange = useCallback<ReactQuillOnChange>(
    (_html, _delta, source, editor) => {
      if (readOnly || source !== "user") return;
      onChange(stringifyDelta(editor.getContents()));
    },
    [onChange, readOnly],
  );

  return (
    <ReactQuill
      theme="snow"
      readOnly={readOnly}
      value={value}
      onChange={handleChange}
      modules={readOnly ? readOnlyModules : quillModules}
      formats={quillFormats}
      placeholder={placeholder}
    />
  );
}
