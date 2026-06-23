"use client";

import { startTransition } from "react";
import { ActionIcon, Autocomplete, Button, Center, Grid, Group, Popover, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconPhotoOff, IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { UploadMedia } from "@homarr/forms-collection";
import type { TranslationObject } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { SelectItemWithDescriptionBadge } from "@homarr/ui";
import { SelectWithDescriptionBadge } from "@homarr/ui";
import { boardSavePartialSettingsSchema } from "@homarr/validation/board";
import { supportedMediaUploadFormats } from "@homarr/validation/media";

import type { Board } from "../../_types";
import { useSavePartialSettingsMutation } from "./_shared";

interface Props {
  board: Board;
}
export const BackgroundSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const { data: session } = useSession();
  const { mutate: savePartialSettings, isPending } = useSavePartialSettingsMutation(board);
  const form = useZodForm(boardSavePartialSettingsSchema, {
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
  const backgroundMedias =
    medias.data?.items.filter(
      (media) => media.contentType.startsWith("image/") || media.contentType.startsWith("video/"),
    ) ?? [];
  const mediaMap = new Map(backgroundMedias.map((media) => [createLocalMediaUrl(media), media]));

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
            <Group wrap="nowrap" gap="xs" w="100%" align="start">
              <Autocomplete
                flex={1}
                leftSection={
                  form.values.backgroundImageUrl &&
                  form.values.backgroundImageUrl.trim().length >= 2 && (
                    <Popover width={300} withArrow>
                      <Popover.Target>
                        <Center h="100%">
                          <MediaPreview
                            src={form.values.backgroundImageUrl}
                            contentType={mediaMap.get(form.values.backgroundImageUrl)?.contentType}
                            w={20}
                            h={20}
                          />
                        </Center>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <MediaPreview
                          src={form.values.backgroundImageUrl}
                          contentType={mediaMap.get(form.values.backgroundImageUrl)?.contentType}
                          w="100%"
                        />
                      </Popover.Dropdown>
                    </Popover>
                  )
                }
                // We filter it on the server
                filter={({ options }) => options}
                label={t("board.field.backgroundImageUrl.label")}
                placeholder={`${t("board.field.backgroundImageUrl.placeholder")}...`}
                renderOption={({ option }) => {
                  const current = mediaMap.get(option.value);
                  if (!current) return null;

                  return (
                    <Group gap="sm">
                      <MediaPreview src={option.value} contentType={current.contentType} w={20} h={20} />
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
                    items: backgroundMedias
                      .filter((media) => media.creatorId === session?.user.id)
                      .map(createLocalMediaUrl),
                  },
                  {
                    group: t("board.field.backgroundImageUrl.group.other"),
                    items: backgroundMedias
                      .filter((media) => media.creatorId !== session?.user.id)
                      .map(createLocalMediaUrl),
                  },
                ]}
                {...form.getInputProps("backgroundImageUrl")}
              />
              {session?.user.permissions.includes("media-upload") && (
                <UploadMedia
                  accept={supportedMediaUploadFormats}
                  onSuccess={(uploadedMedias) => {
                    const first = uploadedMedias.at(0);
                    if (!first) return;

                    startTransition(() => {
                      form.setFieldValue("backgroundImageUrl", first.url);
                    });
                  }}
                >
                  {({ onClick, loading }) => (
                    <ActionIcon onClick={onClick} loading={loading} mt={24} size={36} variant="default">
                      <IconUpload size={16} stroke={1.5} />
                    </ActionIcon>
                  )}
                </UploadMedia>
              )}
            </Group>
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
          <Button type="submit" loading={isPending}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

interface MediaPreviewProps {
  src: string;
  contentType?: string;
  w: string | number;
  h?: string | number;
}

const MediaPreview = ({ src, contentType, w, h }: MediaPreviewProps) => {
  if (!["/", "http://", "https://"].some((prefix) => src.startsWith(prefix))) {
    return <IconPhotoOff size={w} />;
  }

  if (contentType?.startsWith("video/") || isVideoUrl(src)) {
    return (
      <video
        src={src}
        aria-label="preview video"
        muted
        playsInline
        preload="metadata"
        style={{ width: w, height: h, objectFit: "contain" }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="preview media" style={{ width: w, height: h, objectFit: "contain" }} />;
};

const createLocalMediaUrl = (media: { id: string; name: string }) => {
  const extension = media.name.match(/\.[^./\\]+$/)?.[0].toLowerCase() ?? "";
  return `/api/user-medias/${media.id}${extension}`;
};

const isVideoUrl = (url: string) =>
  [".mp4", ".webm", ".ogg"].some((extension) => url.toLowerCase().endsWith(extension));

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
