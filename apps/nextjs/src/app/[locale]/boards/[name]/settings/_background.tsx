"use client";

import { startTransition } from "react";
import { ActionIcon, Autocomplete, Center, Grid, Group, Popover, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconPhotoOff, IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { UploadMedia } from "@homarr/forms-collection";
import type { TranslationObject } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { SelectItemWithDescriptionBadge } from "@homarr/ui";
import { SelectWithDescriptionBadge } from "@homarr/ui";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./_settings-form";

interface Props {
  form: UseFormReturnType<FormValues>;
}

export const BackgroundSettingsContent = ({ form }: Props) => {
  const tBoard = useI18n("board");
  const { data: session } = useSession();

  const [debouncedSearch] = useDebouncedValue(form.values.backgroundImageUrl ?? "", 200);
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
    <SectionCard title={tBoard("setting.section.background.title")}>
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
                        <ImagePreview src={form.values.backgroundImageUrl} w={20} h={20} />
                      </Center>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <ImagePreview src={form.values.backgroundImageUrl} w="100%" />
                    </Popover.Dropdown>
                  </Popover>
                )
              }
              // We filter it on the server
              filter={({ options }) => options}
              label={tBoard("field.backgroundImageUrl.label")}
              placeholder={`${tBoard("field.backgroundImageUrl.placeholder")}...`}
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
                  group: tBoard("field.backgroundImageUrl.group.your"),
                  items: images
                    .filter((media) => media.creatorId === session?.user.id)
                    .map((media) => `/api/user-medias/${media.id}`),
                },
                {
                  group: tBoard("field.backgroundImageUrl.group.other"),
                  items: images
                    .filter((media) => media.creatorId !== session?.user.id)
                    .map((media) => `/api/user-medias/${media.id}`),
                },
              ]}
              {...form.getInputProps("backgroundImageUrl")}
            />
            {session?.user.permissions.includes("media-upload") && (
              <UploadMedia
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
            label={tBoard("field.backgroundImageAttachment.label")}
            data={backgroundImageAttachmentData}
            {...form.getInputProps("backgroundImageAttachment")}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <SelectWithDescriptionBadge
            label={tBoard("field.backgroundImageSize.label")}
            data={backgroundImageSizeData}
            {...form.getInputProps("backgroundImageSize")}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <SelectWithDescriptionBadge
            label={tBoard("field.backgroundImageRepeat.label")}
            data={backgroundImageRepeatData}
            {...form.getInputProps("backgroundImageRepeat")}
          />
        </Grid.Col>
      </Grid>
    </SectionCard>
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
  const tBoard = useI18n("board");
  const tCommon = useI18n("common");

  return data.values.map(
    (value) =>
      ({
        label: tBoard(`field.${key}.option.${value as string}.label` as never),
        description: tBoard(`field.${key}.option.${value as string}.description` as never),
        value: value as string,
        badge:
          data.defaultValue === value
            ? {
                color: "blue",
                label: tCommon("select.badge.recommended"),
              }
            : undefined,
      }) satisfies SelectItemWithDescriptionBadge,
  );
};
