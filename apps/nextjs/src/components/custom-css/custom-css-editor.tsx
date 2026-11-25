"use client";

import { CodeEditor } from "@homarr/forms-collection/custom-widgets";

interface CustomCssEditorProps {
  id: string;
  label: string;
  description?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: React.ReactNode;
  actions?: React.ReactNode;
  height?: string;
  readOnly?: boolean;
}

export const CustomCssEditor = ({
  id,
  label,
  description,
  value = "",
  onChange,
  error,
  actions,
  height = "250px",
  readOnly,
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
      height={height}
      readOnly={readOnly}
      maxLength={16_384}
      actions={actions}
    />
  );
};
