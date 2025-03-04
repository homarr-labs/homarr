"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ActionIcon, Button, Divider, Fieldset, Grid, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { IconEdit, IconTrash } from "@tabler/icons-react";

import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { IconPicker } from "../../../forms-collection/src";
import { Release } from "../releases/release";
import { Providers } from "../releases/release-providers";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

interface FormValidation {
  hasErrors: boolean;
  errors: FormErrors;
}

export const WidgetMultiReleasesInput = ({ property, kind }: CommonWidgetInputProps<"multiReleases">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tReleases = useScopedI18n("widget.releases");
  const form = useFormContext();
  const releases = form.values.options[property] as Release[];
  const { openModal } = useModalAction(releaseEditModal);

  const onReleaseSave = useCallback(
    (release: Release, index: number): FormValidation => {
      form.setFieldValue(`options.${property}.${index}.provider`, release.provider);
      form.setFieldValue(`options.${property}.${index}.identifier`, release.identifier);
      form.setFieldValue(`options.${property}.${index}.versionRegex`, release.versionRegex);
      form.setFieldValue(`options.${property}.${index}.iconUrl`, release.iconUrl);

      return form.validate();
    },
    [form, property],
  );

  const providers = useMemo(() => {
    return Object.values(Providers).map((provider) => provider.name);
  }, []);

  const addNewItem = () => {
    const item = new Release(Providers.Docker, "");

    form.setValues((previous) => {
      const previousValues = previous.options?.[property] as Release[];
      return {
        ...previous,
        options: {
          ...previous.options,
          [property]: [...previousValues, item],
        },
      };
    });
  };

  const onReleaseRemove = (index: number) => {
    form.setValues((previous) => {
      const previousValues = previous.options?.[property] as Release[];
      return {
        ...previous,
        options: {
          ...previous.options,
          [property]: previousValues.filter((_, i) => i !== index),
        },
      };
    });
  };

  return (
    <Fieldset legend={t("label")}>
      <Stack gap="5">
        <Button onClick={addNewItem}>{tReleases("option.addRelease.label")}</Button>
        <Divider my="sm" />

        {releases.map((release, index) => {
          return (
            <Stack key={`${release.provider.name}.${release.identifier}`} gap="5">
              <Grid align="center" gutter="xs">
                <Grid.Col span="content">
                  <MaskedOrNormalImage
                    hasColor={false}
                    imageUrl={release.iconUrl ?? release.provider.iconUrl}
                    style={{
                      height: "1em",
                      width: "1em",
                    }}
                  />
                </Grid.Col>
                <Grid.Col span="content">
                  <Text c="dimmed" fw={100} size="xs">
                    {release.provider.name}
                  </Text>
                </Grid.Col>
                <Grid.Col span="auto">
                  <Text size="sm">{release.identifier}</Text>
                </Grid.Col>
                <Grid.Col span="content">
                  <Text c="dimmed" size="xs">
                    {release.versionRegex}
                  </Text>
                </Grid.Col>
                <Grid.Col span="content">
                  <Button
                    onClick={() =>
                      openModal({
                        fieldPath: `options.${property}.${index}`,
                        release,
                        onReleaseSave: (saved) => onReleaseSave(saved, index),
                        providers,
                      })
                    }
                    variant="light"
                    leftSection={<IconEdit size={15} />}
                    size="xs"
                  >
                    {tReleases("option.edit.label")}
                  </Button>
                </Grid.Col>
                <Grid.Col span="content">
                  <ActionIcon variant="transparent" color="red" onClick={() => onReleaseRemove(index)}>
                    <IconTrash size={15} />
                  </ActionIcon>
                </Grid.Col>
              </Grid>
              <Divider my="sm" size="xs" mt={5} mb={5} />
            </Stack>
          );
        })}
      </Stack>
    </Fieldset>
  );
};

interface ReleaseEditProps {
  fieldPath: string;
  release: Release;
  onReleaseSave: (release: Release) => FormValidation;
  providers: string[];
}

const releaseEditModal = createModal<ReleaseEditProps>(({ innerProps, actions }) => {
  const tReleases = useScopedI18n("widget.releases");
  const [loading, setLoading] = useState(false);
  const [tempRelease, setTempRelease] = useState(innerProps.release);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleConfirm = useCallback(() => {
    setLoading(true);

    const validation = innerProps.onReleaseSave(tempRelease);
    setFormErrors(validation.errors);
    if (!validation.hasErrors) {
      actions.closeModal();
    }

    setLoading(false);
  }, [innerProps, tempRelease, actions]);

  const handleChange = useCallback(
    (changedValue: Partial<Release>) => {
      setTempRelease((prev) => ({ ...prev, ...changedValue }));
      const validation = innerProps.onReleaseSave({ ...tempRelease, ...changedValue });
      setFormErrors(validation.errors);
    },
    [innerProps, tempRelease],
  );

  return (
    <Stack>
      <Grid gutter="xs">
        <Grid.Col span={4}>
          <Select
            withAsterisk
            label={tReleases("option.provider.label")}
            data={innerProps.providers}
            value={tempRelease.provider.name}
            key={`${innerProps.fieldPath}.provider`}
            error={formErrors[`${innerProps.fieldPath}.provider`]}
            onChange={(value) => {
              if (value !== null && value in Providers) {
                const provider = Providers[value];
                if (provider) {
                  handleChange({ provider });
                }
              }
            }}
          />
        </Grid.Col>
        <Grid.Col span={7}>
          <TextInput
            withAsterisk
            label={tReleases("option.identifier.label")}
            value={tempRelease.identifier}
            onChange={(event) => {
              handleChange({ identifier: event.currentTarget.value });
            }}
            key={`${innerProps.fieldPath}.identifier`}
            error={formErrors[`${innerProps.fieldPath}.identifier`]}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <TextInput
            label={tReleases("option.versionRegex.label")}
            value={tempRelease.versionRegex ?? ""}
            onChange={(event) => {
              handleChange({ versionRegex: event.currentTarget.value });
            }}
            key={`${innerProps.fieldPath}.versionRegex`}
            error={formErrors[`${innerProps.fieldPath}.versionRegex`]}
          />
        </Grid.Col>
        <Grid.Col span={7}>
          <IconPicker
            withAsterisk={false}
            value={tempRelease.iconUrl}
            onChange={(url) => handleChange({ iconUrl: url })}
            key={`${innerProps.fieldPath}.iconUrl`}
            error={formErrors[`${innerProps.fieldPath}.iconUrl`] as string}
          />
        </Grid.Col>
      </Grid>
      <Divider my={"sm"} />
      <Group justify="flex-end">
        <Button variant="default" onClick={actions.closeModal}>
          {tReleases("editForm.cancel.label")}
        </Button>

        <Button data-autofocus onClick={handleConfirm} color="red.9" loading={loading}>
          {tReleases("editForm.confirm.label")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle(t) {
    return t("widget.releases.editForm.title");
  },
  size: "xl",
});
