"use client";

import { useCallback, useMemo } from "react";
import type { ComponentProps } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import type { DeltaStatic } from "react-quill-new";

import type { QuillDelta } from "./content";
import { parseStoredOperations, stringifyDelta } from "./content";
import { AnchorNoteEditorView } from "./native-view-editor";

import "react-quill-new/dist/quill.snow.css";

type ReactQuillOnChange = NonNullable<ComponentProps<typeof ReactQuill>["onChange"]>;

const DeltaConstructor = Quill.import("delta") as new (
  ops?: QuillDelta["ops"] | { ops: QuillDelta["ops"] },
) => DeltaStatic;

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
    <AnchorNoteEditorView
      editorComponent={ReactQuill}
      readOnly={readOnly}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}
