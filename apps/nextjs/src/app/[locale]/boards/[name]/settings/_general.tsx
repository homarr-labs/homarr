"use client";

import { useEffect } from "react";
import {
  useDebouncedValue,
  useDocumentTitle,
  useFavicon,
} from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { Button, Grid, Group, Stack, TextInput } from "@homarr/ui";

import { useUpdateBoard } from "../../_client";
import type { Board } from "../../_types";

interface Props {
  board: Board;
}

export const GeneralSettingsContent = ({ board }: Props) => {
  const { updateBoard } = useUpdateBoard();
  const { mutate, isPending } =
    clientApi.board.saveGeneralSettings.useMutation();
  const form = useForm({
    initialValues: {
      pageTitle: board.pageTitle,
      logoImageUrl: board.logoImageUrl,
      metaTitle: board.metaTitle,
      faviconImageUrl: board.faviconImageUrl,
    },
    onValuesChange({ pageTitle }) {
      updateBoard((prev) => ({
        ...prev,
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
        mutate(values);
      })}
    >
      <Stack>
        <Grid>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label="Page title"
              {...form.getInputProps("pageTitle")}
            />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label="Meta title"
              {...form.getInputProps("metaTitle")}
            />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label="Logo image URL"
              {...form.getInputProps("logoImageUrl")}
            />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label="Favicon image URL"
              {...form.getInputProps("faviconImageUrl")}
            />
          </Grid.Col>
        </Grid>
        <Group justify="end">
          <Button type="submit" loading={isPending}>
            Save changes
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
    updateBoard((prev) => ({
      ...prev,
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
