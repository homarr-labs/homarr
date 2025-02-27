"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ActionIcon, Button, Divider, Fieldset, Grid, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { IconEdit, IconTrash } from "@tabler/icons-react";

import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { IconPicker } from "../../../forms-collection/src";
import { Repository } from "../repositories/repository";
import { Providers } from "../repositories/repository-providers";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

interface FormValidation {
  hasErrors: boolean;
  errors: FormErrors;
}

export const WidgetMultiRepositoriesInput = ({ property, kind }: CommonWidgetInputProps<"multiRepositories">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tRepositories = useScopedI18n("widget.repositories");
  const form = useFormContext();
  const repositories = form.values.options[property] as Repository[];
  const { openModal } = useModalAction(repositoryEditModal);

  const onRepositorySave = useCallback(
    (repository: Repository, index: number): FormValidation => {
      form.setFieldValue(`options.${property}.${index}.provider`, repository.provider);
      form.setFieldValue(`options.${property}.${index}.identifier`, repository.identifier);
      form.setFieldValue(`options.${property}.${index}.versionRegex`, repository.versionRegex);
      form.setFieldValue(`options.${property}.${index}.iconUrl`, repository.iconUrl);

      return form.validate();
    },
    [form, property],
  );

  const providers = useMemo(() => {
    return Object.values(Providers).map((provider) => provider.name);
  }, []);

  const addNewItem = () => {
    const item = new Repository(Providers.Docker, "", "");

    form.setValues((previous) => {
      const previousValues = previous.options?.[property] as Repository[];
      return {
        ...previous,
        options: {
          ...previous.options,
          [property]: [...previousValues, item],
        },
      };
    });
  };

  const onRepositoryRemove = (index: number) => {
    form.setValues((previous) => {
      const previousValues = previous.options?.[property] as Repository[];
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
        <Button onClick={addNewItem}>{tRepositories("option.addRepository.label")}</Button>
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
                    {repository.versionRegex}
                  </Text>
                </Grid.Col>
                <Grid.Col span="content">
                  <Button
                    onClick={() =>
                      openModal({
                        fieldPath: `options.${property}.${index}`,
                        repository,
                        onRepositorySave: (savedRepository) => onRepositorySave(savedRepository, index),
                        providers,
                      })
                    }
                    variant="light"
                    leftSection={<IconEdit size={15} />}
                    size="xs"
                  >
                    {tRepositories("option.edit.label")}
                  </Button>
                </Grid.Col>
                <Grid.Col span="content">
                  <ActionIcon variant="transparent" color="red" onClick={() => onRepositoryRemove(index)}>
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

interface RepositoryEditProps {
  fieldPath: string;
  repository: Repository;
  onRepositorySave: (repository: Repository) => FormValidation;
  providers: string[];
}

const repositoryEditModal = createModal<RepositoryEditProps>(({ innerProps, actions }) => {
  const tRepositories = useScopedI18n("widget.repositories");
  const [loading, setLoading] = useState(false);
  const [tempRepository, setTempRepository] = useState(innerProps.repository);
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

  const handleChange = useCallback(
    (changedValue: Partial<Repository>) => {
      setTempRepository((prev) => ({ ...prev, ...changedValue }));
      const validation = innerProps.onRepositorySave({ ...tempRepository, ...changedValue });
      setFormErrors(validation.errors);
    },
    [innerProps, tempRepository],
  );

  return (
    <Stack>
      <Grid gutter="xs">
        <Grid.Col span={4}>
          <Select
            withAsterisk
            label={tRepositories("option.provider.label")}
            data={innerProps.providers}
            value={tempRepository.provider.name}
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
            label={tRepositories("option.identifier.label")}
            value={tempRepository.identifier}
            onChange={(event) => {
              handleChange({ identifier: event.currentTarget.value });
            }}
            key={`${innerProps.fieldPath}.identifier`}
            error={formErrors[`${innerProps.fieldPath}.identifier`]}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <TextInput
            label={tRepositories("option.versionRegex.label")}
            value={tempRepository.versionRegex}
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
            value={tempRepository.iconUrl}
            onChange={(url) => handleChange({ iconUrl: url })}
            key={`${innerProps.fieldPath}.iconUrl`}
            error={formErrors[`${innerProps.fieldPath}.iconUrl`] as string}
          />
        </Grid.Col>
      </Grid>
      <Divider my={"sm"} />
      <Group justify="flex-end">
        <Button variant="default" onClick={actions.closeModal}>
          {tRepositories("editForm.cancel.label")}
        </Button>

        <Button data-autofocus onClick={handleConfirm} color="red.9" loading={loading}>
          {tRepositories("editForm.confirm.label")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle(t) {
    return t("widget.repositories.editForm.title");
  },
  size: "xl",
});
