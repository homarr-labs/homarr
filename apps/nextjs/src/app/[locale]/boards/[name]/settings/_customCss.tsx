"use client";

import { Alert, Button, Group, Input, Stack } from "@mantine/core";
import { highlight, languages } from "prismjs";
import Editor from "react-simple-code-editor";

import "~/styles/prismjs.scss";

import { IconInfoCircle } from "@tabler/icons-react";

import { useForm } from "@homarr/form";
import { useSession } from "@homarr/auth/client";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { WorkshopCssImportButton } from "~/components/workshop/workshop-css-import-button";

import type { Board } from "../../_types";
import { useSavePartialSettingsMutation } from "./_shared";
import classes from "./customcss.module.css";

interface Props {
  board: Board;
}

export const CustomCssSettingsContent = ({ board }: Props) => {
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const t = useI18n();
  const customCssT = useScopedI18n("board.field.customCss");
  const { mutate: savePartialSettings, isPending } = useSavePartialSettingsMutation(board);
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

        <Alert variant="light" color="cyan" title={customCssT("customClassesAlert.title")} icon={<IconInfoCircle />}>
          {customCssT("customClassesAlert.description")}
        </Alert>

        <Group justify="space-between">
          {isAdmin ? <WorkshopCssImportButton onImport={(css) => form.setFieldValue("customCss", css)} /> : <span />}
          <Button type="submit" loading={isPending}>
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
  const customCssT = useScopedI18n("board.field.customCss");

  return (
    <Input.Wrapper
      label={customCssT("label")}
      labelProps={{
        htmlFor: "custom-css",
      }}
      description={customCssT("description")}
      inputWrapperOrder={["label", "description", "input", "error"]}
    >
      <div className={classes.codeEditorRoot}>
        <Editor
          textareaId="custom-css"
          onValueChange={onChange}
          value={value ?? ""}
          highlight={(code) => highlight(code, languages.extend("css", {}), "css")}
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
