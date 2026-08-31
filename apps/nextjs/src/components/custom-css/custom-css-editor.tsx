"use client";

import { Group, Input, Stack } from "@mantine/core";
import { highlight, languages } from "prismjs";
import Editor from "react-simple-code-editor";

import "~/styles/prismjs.scss";

import classes from "./custom-css-editor.module.css";

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
    <Stack gap="xs">
      <Group justify="space-between" align="end">
        <div>
          <Input.Label htmlFor={id}>{label}</Input.Label>
          <Input.Description>{description}</Input.Description>
        </div>
        {actions}
      </Group>
      <Input.Wrapper error={error} inputWrapperOrder={["input", "error"]}>
        <div className={classes.root}>
          <Editor
            textareaId={id}
            onValueChange={onChange}
            value={value}
            highlight={(code) => highlight(code, languages.extend("css", {}), "css")}
            padding={10}
            className={classes.editor}
          />
        </div>
      </Input.Wrapper>
    </Stack>
  );
};
