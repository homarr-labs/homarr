"use client";

import { Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { CustomCssEditor } from "~/components/custom-css/custom-css-editor";
import { SectionCard } from "~/components/manage/section-card";
import { WorkshopCssImportButton } from "~/components/workshop/workshop-css-import-button";
import type { FormValues } from "./_settings-form";

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
      <CustomCssEditor
        id="board-custom-css"
        label={customCssT("label")}
        description={customCssT("description")}
        {...form.getInputProps("customCss")}
      />

      <Alert variant="light" color="cyan" title={customCssT("customClassesAlert.title")} icon={<IconInfoCircle />}>
        {customCssT("customClassesAlert.description")}
      </Alert>
      {isAdmin && <WorkshopCssImportButton onImport={(css) => form.setFieldValue("customCss", css)} />}
    </SectionCard>
  );
};
