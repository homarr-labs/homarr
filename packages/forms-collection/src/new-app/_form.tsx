"use client";

import type { ChangeEventHandler } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button, Checkbox, Collapse, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import type { z } from "zod";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { IconPicker } from "../icon-picker/icon-picker";

type FormType = z.infer<typeof validation.app.manage>;

interface AppFormProps {
  showBackToOverview: boolean;
  buttonLabels: {
    submit: string;
    submitAndCreateAnother?: string;
  };
  initialValues?: FormType;
  handleSubmit: (values: FormType, redirect: boolean, afterSuccess?: () => void) => void;
  isPending: boolean;
}

export const AppForm = ({
  buttonLabels,
  showBackToOverview,
  handleSubmit: originalHandleSubmit,
  initialValues,
  isPending,
}: AppFormProps) => {
  const t = useI18n();

  const form = useZodForm(validation.app.manage, {
    initialValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      iconUrl: initialValues?.iconUrl ?? "",
      href: initialValues?.href ?? "",
      pingUrl: initialValues?.pingUrl ?? "",
    },
  });

  // Debounce the name value with 200ms delay
  const [debouncedName] = useDebouncedValue(form.values.name, 200);

  const shouldCreateAnother = useRef(false);
  const handleSubmit = (values: FormType) => {
    const redirect = !shouldCreateAnother.current;
    const afterSuccess = shouldCreateAnother.current
      ? () => {
          form.reset();
          shouldCreateAnother.current = false;
        }
      : undefined;
    originalHandleSubmit(values, redirect, afterSuccess);
  };

  const [opened, { open, close }] = useDisclosure((initialValues?.pingUrl?.length ?? 0) > 0);

  const handleClickDifferentUrlPing: ChangeEventHandler<HTMLInputElement> = () => {
    if (!opened) {
      open();
    } else {
      close();
      form.setFieldValue("pingUrl", "");
    }
  };

  // Auto-select icon based on app name with debounced search
  const { data: iconsData } = clientApi.icon.findIcons.useQuery(
    {
      searchText: debouncedName,
    },
    {
      enabled: debouncedName.length > 3,
    },
  );

  useEffect(() => {
    if (debouncedName && !form.values.iconUrl && iconsData?.icons) {
      // Find exact matches first, then partial matches
      let exactSvgMatch = null;
      let exactNonSvgMatch = null;
      let partialSvgMatch = null;
      let partialNonSvgMatch = null;

      const nameLower = debouncedName.toLowerCase();

      for (const group of iconsData.icons) {
        for (const icon of group.icons) {
          const iconNameLower = icon.url.toLowerCase();
          const fileNameParts = iconNameLower.split("/");
          const fileName = fileNameParts[fileNameParts.length - 1]?.split(".")[0];

          // Check for exact match first (the file name equals the search term)
          if (fileName === nameLower) {
            if (icon.url.endsWith(".svg")) {
              exactSvgMatch = icon.url;
            } else if (!exactNonSvgMatch) {
              exactNonSvgMatch = icon.url;
            }
          }
          // Then check for partial match
          else if (fileName?.includes(nameLower)) {
            if (icon.url.endsWith(".svg") && !partialSvgMatch) {
              partialSvgMatch = icon.url;
            } else if (!partialNonSvgMatch) {
              partialNonSvgMatch = icon.url;
            }
          }
        }
        if (exactSvgMatch) break;
      }

      // Set the icon URL with priority: exact SVG > exact non-SVG > partial SVG > partial non-SVG
      if (exactSvgMatch) {
        form.setFieldValue("iconUrl", exactSvgMatch);
      } else if (exactNonSvgMatch) {
        form.setFieldValue("iconUrl", exactNonSvgMatch);
      } else if (partialSvgMatch) {
        form.setFieldValue("iconUrl", partialSvgMatch);
      } else if (partialNonSvgMatch) {
        form.setFieldValue("iconUrl", partialNonSvgMatch);
      }
    }
  }, [debouncedName, iconsData]);

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label={t("app.field.name.label")} />
        <IconPicker {...form.getInputProps("iconUrl")} />
        <Textarea {...form.getInputProps("description")} label={t("app.field.description.label")} />
        <TextInput {...form.getInputProps("href")} label={t("app.field.url.label")} />

        <Checkbox
          checked={opened}
          onChange={handleClickDifferentUrlPing}
          label={t("app.field.useDifferentUrlForPing.checkbox.label")}
          description={t("app.field.useDifferentUrlForPing.checkbox.description")}
          mt="md"
        />

        <Collapse in={opened}>
          <TextInput {...form.getInputProps("pingUrl")} />
        </Collapse>

        <Group justify="end">
          {showBackToOverview && (
            <Button variant="default" component={Link} href="/manage/apps">
              {t("common.action.backToOverview")}
            </Button>
          )}
          {buttonLabels.submitAndCreateAnother && (
            <Button
              type="submit"
              onClick={() => {
                shouldCreateAnother.current = true;
              }}
              loading={isPending}
            >
              {buttonLabels.submitAndCreateAnother}
            </Button>
          )}
          <Button type="submit" loading={isPending}>
            {buttonLabels.submit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
