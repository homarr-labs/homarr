"use client";

import { Alert, Input } from "@mantine/core";
import { highlight, languages } from "prismjs";
import Editor from "react-simple-code-editor";

import "~/styles/prismjs.scss";

import { IconInfoCircle } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import { WorkshopCssImportButton } from "~/components/workshop/workshop-css-import-button";
import type { FormValues } from "./_settings-form";
import classes from "./customcss.module.css";

interface Props {
  form: UseFormReturnType<FormValues>;
}

export const CustomCssSettingsContent = ({ form }: Props) => {
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const t = useI18n("board");
  const customCssT = useI18n("board.field.customCss");

  return (
    <SectionCard title={t("setting.section.customCss.title")}>
      <CustomCssInput {...form.getInputProps("customCss")} />

      <Alert variant="light" color="cyan" title={customCssT("customClassesAlert.title")} icon={<IconInfoCircle />}>
        {customCssT("customClassesAlert.description")}
      </Alert>
      {isAdmin && <WorkshopCssImportButton onImport={(css) => form.setFieldValue("customCss", css)} />}
    </SectionCard>
  );
};

interface CustomCssInputProps {
  value?: string;
  onChange: (value: string) => void;
  error?: React.ReactNode;
}

const CustomCssInput = ({ value, onChange, error }: CustomCssInputProps) => {
  const customCssT = useI18n("board.field.customCss");

  return (
    <Input.Wrapper
      label={customCssT("label")}
      labelProps={{
        htmlFor: "custom-css",
      }}
      description={customCssT("description")}
      error={error}
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
