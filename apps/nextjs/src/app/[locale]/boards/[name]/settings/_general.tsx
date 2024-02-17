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
import {
  Button,
  Grid,
  Group,
  IconAlertTriangle,
  Loader,
  Stack,
  TextInput,
  Tooltip,
} from "@homarr/ui";

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
      pageTitle: board.pageTitle ?? "",
      logoImageUrl: board.logoImageUrl ?? "",
      metaTitle: board.metaTitle ?? "",
      faviconImageUrl: board.faviconImageUrl ?? "",
    },
    onValuesChange({ pageTitle }) {
      updateBoard((previous) => ({
        ...previous,
        pageTitle,
      }));
    },
  });

  const metaTitleStatus = useMetaTitlePreview(form.values.metaTitle);
  const faviconStatus = useFaviconPreview(form.values.faviconImageUrl);
  const logoStatus = useLogoPreview(form.values.logoImageUrl);

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
              rightSection={<PendingOrInvalidIndicator {...metaTitleStatus} />}
              {...form.getInputProps("metaTitle")}
            />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label={t("board.field.logoImageUrl.label")}
              rightSection={<PendingOrInvalidIndicator {...logoStatus} />}
              {...form.getInputProps("logoImageUrl")}
            />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, md: 6 }}>
            <TextInput
              label={t("board.field.faviconImageUrl.label")}
              rightSection={<PendingOrInvalidIndicator {...faviconStatus} />}
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

const PendingOrInvalidIndicator = ({
  isPending,
  isInvalid,
}: {
  isPending: boolean;
  isInvalid?: boolean;
}) => {
  const t = useI18n();

  if (isInvalid) {
    return (
      <Tooltip
        multiline
        w={220}
        label={t("board.setting.section.general.unrecognizedLink")}
      >
        <IconAlertTriangle size="1rem" color="red" />
      </Tooltip>
    );
  }

  if (isPending) {
    return <Loader size="xs" />;
  }

  return null;
};

const useLogoPreview = (url: string | null) => {
  const { updateBoard } = useUpdateBoard();
  const [logoDebounced] = useDebouncedValue(url ?? "", 500);

  useEffect(() => {
    if (!logoDebounced.includes(".") && logoDebounced.length >= 1) return;
    updateBoard((previous) => ({
      ...previous,
      logoImageUrl: logoDebounced.length >= 1 ? logoDebounced : null,
    }));
  }, [logoDebounced, updateBoard]);

  return {
    isPending: (url ?? "") !== logoDebounced,
    isInvalid: logoDebounced.length >= 1 && !logoDebounced.includes("."),
  };
};

const useMetaTitlePreview = (title: string | null) => {
  const [metaTitleDebounced] = useDebouncedValue(title ?? "", 200);
  useDocumentTitle(metaTitleDebounced);

  return {
    isPending: (title ?? "") !== metaTitleDebounced,
  };
};

const validFaviconExtensions = ["ico", "png", "svg", "gif"];
const isValidUrl = (url: string) =>
  url.includes("/") &&
  validFaviconExtensions.some((extension) => url.endsWith(`.${extension}`));

const useFaviconPreview = (url: string | null) => {
  const [faviconDebounced] = useDebouncedValue(url ?? "", 500);
  useFavicon(isValidUrl(faviconDebounced) ? faviconDebounced : "");

  return {
    isPending: (url ?? "") !== faviconDebounced,
    isInvalid: faviconDebounced.length >= 1 && !isValidUrl(faviconDebounced),
  };
};
