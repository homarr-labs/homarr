"use client";

import type { AutocompleteProps } from "@mantine/core";
import { Autocomplete, Button, Grid, Group, Popover, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import type { TranslationObject } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { SelectItemWithDescriptionBadge } from "@homarr/ui";
import { SelectWithDescriptionBadge } from "@homarr/ui";
import { validation } from "@homarr/validation";

import type { Board } from "../../_types";
import { useSavePartialSettingsMutation } from "./_shared";

interface Props {
  board: Board;
}
export const BackgroundSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const { data: session } = useSession();
  const { mutate: savePartialSettings, isPending } = useSavePartialSettingsMutation(board);
  const form = useZodForm(validation.board.savePartialSettings, {
    initialValues: {
      backgroundImageUrl: board.backgroundImageUrl ?? "",
      backgroundImageAttachment: board.backgroundImageAttachment,
      backgroundImageRepeat: board.backgroundImageRepeat,
      backgroundImageSize: board.backgroundImageSize,
    },
  });
  const medias = clientApi.media.getPaginated.useQuery({
    page: 1,
    pageSize: 100,
    includeFromAllUsers: true,
  });
  const images = medias.data?.items.filter((media) => media.contentType.startsWith("image/")) ?? [];

  const backgroundImageAttachmentData = useBackgroundOptionData(
    "backgroundImageAttachment",
    backgroundImageAttachments,
  );
  const backgroundImageSizeData = useBackgroundOptionData("backgroundImageSize", backgroundImageSizes);
  const backgroundImageRepeatData = useBackgroundOptionData("backgroundImageRepeat", backgroundImageRepeats);

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
        <Grid>
          <Grid.Col span={12}>
            <Autocomplete
              leftSection={
                form.values.backgroundImageUrl &&
                form.values.backgroundImageUrl.trim().length >= 2 && (
                  <Popover width={300} withArrow>
                    <Popover.Target>
                      <img
                        src={form.values.backgroundImageUrl}
                        alt="preview image"
                        style={{ width: 20, height: 20, objectFit: "contain" }}
                      />
                    </Popover.Target>
                    <Popover.Dropdown>
                      <img src={form.values.backgroundImageUrl} alt="preview image" style={{ width: "100%" }} />
                    </Popover.Dropdown>
                  </Popover>
                )
              }
              label={t("board.field.backgroundImageUrl.label")}
              renderOption={renderAutocompleteOption}
              data={[
                {
                  group: t("board.field.backgroundImageUrl.group.your"),
                  items: images
                    .filter((media) => media.creatorId === session?.user.id)
                    .map((media) => `/api/user-medias/${media.id}`),
                },
                {
                  group: t("board.field.backgroundImageUrl.group.other"),
                  items: images
                    .filter((media) => media.creatorId !== session?.user.id)
                    .map((media) => `/api/user-medias/${media.id}`),
                },
              ]}
              {...form.getInputProps("backgroundImageUrl")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <SelectWithDescriptionBadge
              label={t("board.field.backgroundImageAttachment.label")}
              data={backgroundImageAttachmentData}
              {...form.getInputProps("backgroundImageAttachment")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <SelectWithDescriptionBadge
              label={t("board.field.backgroundImageSize.label")}
              data={backgroundImageSizeData}
              {...form.getInputProps("backgroundImageSize")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <SelectWithDescriptionBadge
              label={t("board.field.backgroundImageRepeat.label")}
              data={backgroundImageRepeatData}
              {...form.getInputProps("backgroundImageRepeat")}
            />
          </Grid.Col>
        </Grid>

        <Group justify="end">
          <Button type="submit" loading={isPending} color="teal">
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

const renderAutocompleteOption: AutocompleteProps["renderOption"] = ({ option }) => (
  <Group gap="sm">
    <img src={option.value} alt="preview image" style={{ width: 20, height: 20, objectFit: "contain" }} />
    <Text size="sm">{option.value}</Text>
  </Group>
);

type BackgroundImageKey = "backgroundImageAttachment" | "backgroundImageSize" | "backgroundImageRepeat";

type inferOptions<TKey extends BackgroundImageKey> = TranslationObject["board"]["field"][TKey]["option"];

const useBackgroundOptionData = <
  TKey extends BackgroundImageKey,
  TOptions extends inferOptions<TKey> = inferOptions<TKey>,
>(
  key: TKey,
  data: {
    values: (keyof TOptions)[];
    defaultValue: keyof TOptions;
  },
) => {
  const t = useI18n();

  return data.values.map(
    (value) =>
      ({
        label: t(`board.field.${key}.option.${value as string}.label` as never),
        description: t(`board.field.${key}.option.${value as string}.description` as never),
        value: value as string,
        badge:
          data.defaultValue === value
            ? {
                color: "blue",
                label: t("common.select.badge.recommended"),
              }
            : undefined,
      }) satisfies SelectItemWithDescriptionBadge,
  );
};
