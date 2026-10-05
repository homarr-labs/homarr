"use client";

import { useEffect } from "react";
import { Grid, Loader, TextInput } from "@mantine/core";
import { useDebouncedValue, useDocumentTitle } from "@mantine/hooks";

import { useUpdateBoard } from "@homarr/boards/updater";
import type { UseFormReturnType } from "@homarr/form";
import { IconPicker } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";
import { useSettings } from "@homarr/settings";

import { SectionCard } from "~/components/manage/section-card";
import type { Board } from "../../_types";
import type { FormValues } from "./_settings-form";

interface Props {
  board: Board;
  form: UseFormReturnType<FormValues>;
}

export const GeneralSettingsContent = ({ board, form }: Props) => {
  const t = useI18n("board");
  const { branding } = useSettings();
  const defaultMetaTitle = t("content.metaTitle", { boardName: board.name });

  useLogoPreview(form.values.logoImageUrl);
  const metaTitleStatus = useMetaTitlePreview(form.values.metaTitle, defaultMetaTitle);

  return (
    <SectionCard title={t("setting.section.general.title")}>
      <Grid>
        <Grid.Col span={{ xs: 12, md: 6 }}>
          <TextInput
            label={t("field.pageTitle.label")}
            placeholder={branding.appName}
            {...form.getInputProps("pageTitle")}
          />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, md: 6 }}>
          <TextInput
            label={t("field.metaTitle.label")}
            placeholder={defaultMetaTitle}
            rightSection={metaTitleStatus.isPending && <Loader size="xs" />}
            {...form.getInputProps("metaTitle")}
          />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, md: 6 }}>
          <IconPicker
            {...form.getInputProps("logoImageUrl")}
            label={t("field.logoImageUrl.label")}
            placeholder={branding.logoImageUrl ?? "/logo/logo.png"}
            withAsterisk={false}
          />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, md: 6 }}>
          <IconPicker
            {...form.getInputProps("faviconImageUrl")}
            label={t("field.faviconImageUrl.label")}
            placeholder={branding.faviconImageUrl ?? branding.logoImageUrl ?? "/logo/logo.png"}
            withAsterisk={false}
          />
        </Grid.Col>
      </Grid>
    </SectionCard>
  );
};

const useLogoPreview = (url: string | null) => {
  const { updateBoard } = useUpdateBoard();
  const [logoDebounced] = useDebouncedValue(url ?? "", 500);

  useEffect(() => {
    updateBoard((previous) => ({
      ...previous,
      logoImageUrl: logoDebounced.length >= 1 ? logoDebounced : null,
    }));
  }, [logoDebounced, updateBoard]);
};

const useMetaTitlePreview = (title: string | null, fallbackTitle: string) => {
  const [metaTitleDebounced] = useDebouncedValue(title ?? "", 200);
  useDocumentTitle(metaTitleDebounced.trim() || fallbackTitle);

  return {
    isPending: (title ?? "") !== metaTitleDebounced,
  };
};
