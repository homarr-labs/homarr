"use client";

import { Autocomplete, Button, Grid, Group, Popover, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconPhotoOff } from "@tabler/icons-react";

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

  const [debouncedSearch] = useDebouncedValue(form.values.backgroundImageUrl, 200);
  const medias = clientApi.media.getPaginated.useQuery({
    page: 1,
    pageSize: 10,
    includeFromAllUsers: true,
    search: debouncedSearch ?? "",
  });
  const images = medias.data?.items.filter((media) => media.contentType.startsWith("image/")) ?? [];
  const imageMap = new Map(images.map((image) => [`/api/user-medias/${image.id}`, image]));

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
                      <ImagePreview src={form.values.backgroundImageUrl} w={20} h={20} />
                    </Popover.Target>
                    <Popover.Dropdown>
                      <ImagePreview src={form.values.backgroundImageUrl} w="100%" />
                    </Popover.Dropdown>
                  </Popover>
                )
              }
              // We filter it on the server
              filter={({ options }) => options}
              label={t("board.field.backgroundImageUrl.label")}
              placeholder={`${t("board.field.backgroundImageUrl.placeholder")}...`}
              renderOption={({ option }) => {
                const current = imageMap.get(option.value);
                if (!current) return null;

                return (
                  <Group gap="sm">
                    <ImagePreview src={option.value} w={20} h={20} />
                    <Stack gap={0}>
                      <Text size="sm">{current.name}</Text>
                      <Text size="xs" c="dimmed">
                        {option.value}
                      </Text>
                    </Stack>
                  </Group>
                );
              }}
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

interface ImagePreviewProps {
  src: string;
  w: string | number;
  h?: string | number;
}

const ImagePreview = ({ src, w, h }: ImagePreviewProps) => {
  if (!["/", "http://", "https://"].some((prefix) => src.startsWith(prefix))) {
    return <IconPhotoOff size={w} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="preview image" style={{ width: w, height: h, objectFit: "contain" }} />;
};

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
