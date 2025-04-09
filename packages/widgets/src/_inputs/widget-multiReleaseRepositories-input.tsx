"use client";

import React, { useCallback, useState } from "react";
import { ActionIcon, Button, Divider, Fieldset, Grid, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { IconEdit, IconTrash } from "@tabler/icons-react";

import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { IconPicker } from "../../../forms-collection/src";
import { Providers } from "../releases/release-providers";
import type { ReleaseRepository, ReleaseVersionFilter } from "../releases/release-repository";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

interface FormValidation {
  hasErrors: boolean;
  errors: FormErrors;
}

export const WidgetMultiReleaseRepositoriesInput = ({
  property,
  kind,
}: CommonWidgetInputProps<"multiReleaseRepositories">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const form = useFormContext();
  const repositories = form.values.options[property] as ReleaseRepository[];
  const { openModal } = useModalAction(ReleaseEditModal);

  const onRepositorySave = useCallback(
    (repository: ReleaseRepository, index: number): FormValidation => {
      form.setFieldValue(`options.${property}.${index}.provider`, repository.provider);
      form.setFieldValue(`options.${property}.${index}.identifier`, repository.identifier);
      form.setFieldValue(`options.${property}.${index}.versionFilter`, repository.versionFilter);
      form.setFieldValue(`options.${property}.${index}.iconUrl`, repository.iconUrl);

      return form.validate();
    },
    [form, property],
  );

  const addNewItem = () => {
    const item = {
      provider: Providers.DockerHub,
    };

    form.setValues((previous) => {
      const previousValues = previous.options?.[property] as ReleaseRepository[];
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
      const previousValues = previous.options?.[property] as ReleaseRepository[];
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
        <Button onClick={addNewItem}>{tRepository("addRRepository.label")}</Button>
        <Divider my="sm" />

        {repositories.map((repository, index) => {
          return (
            <Stack key={`${repository.provider.name}.${repository.identifier}`} gap="5">
              <Grid align="center" gutter="xs">
                <Grid.Col span="content">
                  <MaskedOrNormalImage
                    hasColor={false}
                    imageUrl={repository.iconUrl ?? repository.provider.iconUrl}
                    style={{
                      height: "1em",
                      width: "1em",
                    }}
                  />
                </Grid.Col>
                <Grid.Col span="content">
                  <Text c="dimmed" fw={100} size="xs">
                    {repository.provider.name}
                  </Text>
                </Grid.Col>
                <Grid.Col span="auto">
                  <Text size="sm">{repository.identifier}</Text>
                </Grid.Col>
                <Grid.Col span="content">
                  <Text c="dimmed" size="xs">
                    {repository.versionFilter?.precision}
                  </Text>
                </Grid.Col>
                <Grid.Col span="content">
                  <Button
                    onClick={() =>
                      openModal({
                        fieldPath: `options.${property}.${index}`,
                        repository,
                        onRepositorySave: (saved) => onRepositorySave(saved, index),
                      })
                    }
                    variant="light"
                    leftSection={<IconEdit size={15} />}
                    size="xs"
                  >
                    {tRepository("edit.label")}
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
  repository: ReleaseRepository;
  onRepositorySave: (repository: ReleaseRepository) => FormValidation;
}

const ReleaseEditModal = createModal<ReleaseEditProps>(({ innerProps, actions }) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const [loading, setLoading] = useState(false);
  const [tempRepository, setTempRepository] = useState(() => ({ ...innerProps.repository }));
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleConfirm = useCallback(() => {
    setLoading(true);

    const validation = innerProps.onRepositorySave(tempRepository);
    setFormErrors(validation.errors);
    if (!validation.hasErrors) {
      actions.closeModal();
    }

    setLoading(false);
  }, [innerProps, tempRepository, actions]);

  const handleChange = useCallback((changedValue: Partial<ReleaseRepository>) => {
    setTempRepository((prev) => ({ ...prev, ...changedValue }));
  }, []);

  return (
    <Stack>
      <Group>
        <Select
          withAsterisk
          label={tRepository("provider.label")}
          data={Object.entries(Providers).map(([key, provider]) => ({
            value: key,
            label: provider.name,
          }))}
          value={Object.keys(Providers).find((key) => Providers[key]?.name === tempRepository.provider.name) ?? ""}
          key={`${innerProps.fieldPath}.provider`}
          error={formErrors[`${innerProps.fieldPath}.provider`]}
          onChange={(value) => {
            if (value && Providers[value]) {
              handleChange({ provider: Providers[value] });
            }
          }}
        />

        <TextInput
          withAsterisk
          label={tRepository("identifier.label")}
          value={tempRepository.identifier}
          onChange={(event) => {
            handleChange({ identifier: event.currentTarget.value });
          }}
          key={`${innerProps.fieldPath}.identifier`}
          error={formErrors[`${innerProps.fieldPath}.identifier`]}
        />
      </Group>
      <Group>
        <Group>
          <TextInput
            label={tRepository("versionFilter.prefix.label")}
            value={tempRepository.versionFilter?.prefix ?? ""}
            onChange={(event) => {
              handleChange({
                versionFilter: {
                  ...(tempRepository.versionFilter ?? {}),
                  prefix: event.currentTarget.value,
                } as ReleaseVersionFilter,
              });
            }}
            key={`${innerProps.fieldPath}.versionFilter.prefix`}
            error={formErrors[`${innerProps.fieldPath}.versionFilter.prefix`]}
          />
          <Select
            label={tRepository("versionFilter.precision.label")}
            data={["None", "1", "2", "3", "4", "5"]}
            value={tempRepository.versionFilter?.precision.toString() ?? "None"}
            onChange={(value) => {
              handleChange({
                versionFilter:
                  value === null || value === "None"
                    ? undefined
                    : ({
                        ...(tempRepository.versionFilter ?? {}),
                        precision: parseInt(value),
                      } as ReleaseVersionFilter),
              });
            }}
            key={`${innerProps.fieldPath}.versionFilter.precision`}
            error={formErrors[`${innerProps.fieldPath}.versionFilter.precision`]}
          />
          <TextInput
            label={tRepository("versionFilter.suffix.label")}
            value={tempRepository.versionFilter?.suffix ?? ""}
            onChange={(event) => {
              handleChange({
                versionFilter: {
                  ...(tempRepository.versionFilter ?? {}),
                  suffix: event.currentTarget.value,
                } as ReleaseVersionFilter,
              });
            }}
            key={`${innerProps.fieldPath}.versionFilter.suffix`}
            error={formErrors[`${innerProps.fieldPath}.versionFilter.suffix`]}
          />
        </Group>

        <IconPicker
          withAsterisk={false}
          value={tempRepository.iconUrl}
          onChange={(url) => handleChange({ iconUrl: url })}
          key={`${innerProps.fieldPath}.iconUrl`}
          error={formErrors[`${innerProps.fieldPath}.iconUrl`] as string}
        />
      </Group>
      <Divider my={"sm"} />
      <Group justify="flex-end">
        <Button variant="default" onClick={actions.closeModal}>
          {tRepository("editForm.cancel.label")}
        </Button>

        <Button data-autofocus onClick={handleConfirm} color="red.9" loading={loading}>
          {tRepository("editForm.confirm.label")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle(t) {
    return t("widget.releases.option.repositories.editForm.title");
  },
  size: "xl",
});
