"use client";

import { Alert, Button, Group, Input, Stack } from "@mantine/core";
import { highlight, languages } from "prismjs";
import Editor from "react-simple-code-editor";

import "~/styles/prismjs.scss";

import { IconInfoCircle } from "@tabler/icons-react";

import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import type { Board } from "../../_types";
import { useSavePartialSettingsMutation } from "./_shared";
import classes from "./customcss.module.css";

interface Props {
  board: Board;
}

export const CustomCssSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const { mutate: savePartialSettings, isPending } =
    useSavePartialSettingsMutation(board);
  const form = useForm({
    initialValues: {
      customCss: board.customCss ?? "",
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        savePartialSettings({
          id: board.id,
          ...values,
        });
      })}
    >
      <Stack>
        <CustomCssInput {...form.getInputProps("customCss")} />

        <Alert
          variant="light"
          color="cyan"
          title="Custom classes"
          icon={<IconInfoCircle />}
        >
          You can add custom classes to your board items in the advanced options
          of each item and use them in the custom CSS above.
        </Alert>

        <Group justify="end">
          <Button type="submit" loading={isPending} color="teal">
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

interface CustomCssInputProps {
  value?: string;
  onChange: (value: string) => void;
}

const CustomCssInput = ({ value, onChange }: CustomCssInputProps) => {
  return (
    <Input.Wrapper
      label="Custom css for this board"
      labelProps={{
        htmlFor: "custom-css",
      }}
      description="Further, customize your dashboard using CSS, only recommended for experienced users"
      inputWrapperOrder={["label", "description", "input", "error"]}
    >
      <div className={classes.codeEditorRoot}>
        <Editor
          textareaId="custom-css"
          onValueChange={onChange}
          value={value ?? ""}
          highlight={(code) =>
            highlight(code, languages.extend("css", {}), "css")
          }
          padding={10}
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 12,
            minHeight: 250,
          }}
        />
      </div>
    </Input.Wrapper>
  );
};
