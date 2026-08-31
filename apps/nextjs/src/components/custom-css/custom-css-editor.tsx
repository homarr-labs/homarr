"use client";

import { CodeEditor } from "~/components/custom-widgets/code-editor";

interface CustomCssEditorProps {
  id: string;
  label: string;
  description: string;
  value?: string;
  onChange: (value: string) => void;
  error?: React.ReactNode;
  actions?: React.ReactNode;
}

export const CustomCssEditor = ({
  id,
  label,
  description,
  value = "",
  onChange,
  error,
  actions,
}: CustomCssEditorProps) => {
  return (
    <CodeEditor
      id={id}
      label={label}
      description={description}
      value={value}
      onChange={onChange}
      error={error}
      language="css"
      height="250px"
      maxLength={16_384}
      actions={actions}
    />
  );
};
