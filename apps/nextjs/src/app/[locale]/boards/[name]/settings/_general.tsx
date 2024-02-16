"use client";

import { useEffect } from "react";
import {
  useDebouncedValue,
  useDocumentTitle,
  useFavicon,
} from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { Button, Grid, Group, Stack, TextInput } from "@homarr/ui";

import { useUpdateBoard } from "../../_client";
import type { Board } from "../../_types";

interface Props {
  board: Board;
}

export const GeneralSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const { updateBoard } = useUpdateBoard();
  const { mutate: saveGeneralSettings, isPending } =
    clientApi.board.saveGeneralSettings.useMutation();
  const form = useForm({
    initialValues: {
      pageTitle: board.pageTitle,
      logoImageUrl: board.logoImageUrl,
      metaTitle: board.metaTitle,
      faviconImageUrl: board.faviconImageUrl,
    },
    onValuesChange({ pageTitle }) {
      updateBoard((previous) => ({
        ...previous,
        pageTitle,
      }));
    },
  });

  useMetaTitlePreview(form.values.metaTitle);
  useFaviconPreview(form.values.faviconImageUrl);
  useLogoPreview(form.values.logoImageUrl);

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        saveGeneralSettings({
          boardId: board.id,
          ...values,
        });
      })}
    >
      <Stack>
        <Grid>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label={t("board.field.pageTitle.label")}
              {...form.getInputProps("pageTitle")}
            />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label={t("board.field.metaTitle.label")}
              {...form.getInputProps("metaTitle")}
            />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label={t("board.field.logoImageUrl.label")}
              {...form.getInputProps("logoImageUrl")}
            />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label={t("board.field.faviconImageUrl.label")}
              {...form.getInputProps("faviconImageUrl")}
            />
          </Grid.Col>
        </Grid>
        <Group justify="end">
          <Button type="submit" loading={isPending}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

const useLogoPreview = (url: string | null) => {
  const { updateBoard } = useUpdateBoard();
  const [logoDebounced] = useDebouncedValue(url ?? "", 500);

  useEffect(() => {
    if (!logoDebounced.includes(".")) return;
    updateBoard((previous) => ({
      ...previous,
      logoImageUrl: logoDebounced,
    }));
  }, [logoDebounced, updateBoard]);
};

const useMetaTitlePreview = (title: string | null) => {
  const [metaTitleDebounced] = useDebouncedValue(title ?? "", 200);
  useDocumentTitle(metaTitleDebounced);
};

const validFaviconExtensions = ["ico", "png", "svg", "gif"];
const isValidUrl = (url: string) =>
  url.includes("/") &&
  validFaviconExtensions.some((extension) => url.endsWith(`.${extension}`));

const useFaviconPreview = (url: string | null) => {
  const [faviconDebounced] = useDebouncedValue(url ?? "", 500);
  useFavicon(isValidUrl(faviconDebounced) ? faviconDebounced : "");
};
