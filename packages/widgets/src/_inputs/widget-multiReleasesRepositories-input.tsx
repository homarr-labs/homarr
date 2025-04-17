"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ActionIcon, Button, Divider, Fieldset, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { escapeForRegEx } from "@tiptap/react";

import { IconPicker } from "@homarr/forms-collection";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { Providers } from "../releases/releases-providers";
import type { ReleasesRepository, ReleasesVersionFilter } from "../releases/releases-repository";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

interface FormValidation {
  hasErrors: boolean;
  errors: FormErrors;
}

export const WidgetMultiReleasesRepositoriesInput = ({
  property,
  kind,
}: CommonWidgetInputProps<"multiReleasesRepositories">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const form = useFormContext();
  const repositories = form.values.options[property] as ReleasesRepository[];
  const { openModal } = useModalAction(ReleaseEditModal);
  const versionFilterPrecisionOptions = useMemo(
    () => [tRepository("versionFilter.precision.options.none"), "#", "#.#", "#.#.#", "#.#.#.#", "#.#.#.#.#"],
    [tRepository],
  );

  const onRepositorySave = useCallback(
    (repository: ReleasesRepository, index: number): FormValidation => {
      form.setFieldValue(`options.${property}.${index}.providerKey`, repository.providerKey);
      form.setFieldValue(`options.${property}.${index}.identifier`, repository.identifier);
      form.setFieldValue(`options.${property}.${index}.versionFilter`, repository.versionFilter);
      form.setFieldValue(`options.${property}.${index}.iconUrl`, repository.iconUrl);

      return form.validate();
    },
    [form, property],
  );

  const addNewItem = () => {
    const item = {
      providerKey: "DockerHub",
      identifier: "",
    };

    form.setValues((previous) => {
      const previousValues = previous.options?.[property] as ReleasesRepository[];
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
      const previousValues = previous.options?.[property] as ReleasesRepository[];
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
            <Stack key={`${repository.providerKey}.${repository.identifier}`} gap={5}>
              <Group align="center" gap="xs">
                <MaskedOrNormalImage
                  hasColor={false}
                  imageUrl={repository.iconUrl ?? Providers[repository.providerKey]?.iconUrl}
                  style={{
                    height: "1em",
                    width: "1em",
                  }}
                />

                <Text c="dimmed" fw={100} size="xs">
                  {Providers[repository.providerKey]?.name}
                </Text>

                <Group justify="space-between" align="center" style={{ flex: 1 }} gap={5}>
                  <Text size="sm" style={{ flex: 1, whiteSpace: "nowrap" }}>
                    {repository.identifier}
                  </Text>

                  <Text c="dimmed" size="xs" ta="end" style={{ flex: 1, whiteSpace: "nowrap" }}>
                    {formatVersionFilterRegex(repository.versionFilter) ?? ""}
                  </Text>
                </Group>

                <Button
                  onClick={() =>
                    openModal({
                      fieldPath: `options.${property}.${index}`,
                      repository,
                      onRepositorySave: (saved) => onRepositorySave(saved, index),
                      versionFilterPrecisionOptions,
                    })
                  }
                  variant="light"
                  leftSection={<IconEdit size={15} />}
                  size="xs"
                >
                  {tRepository("edit.label")}
                </Button>

                <ActionIcon variant="transparent" color="red" onClick={() => onReleaseRemove(index)}>
                  <IconTrash size={15} />
                </ActionIcon>
              </Group>

              <Divider my="sm" size="xs" mt={5} mb={5} />
            </Stack>
          );
        })}
      </Stack>
    </Fieldset>
  );
};

const formatVersionFilterRegex = (versionFilter: ReleasesVersionFilter | undefined) => {
  if (!versionFilter) return undefined;

  const escapedPrefix = versionFilter.prefix ? escapeForRegEx(versionFilter.prefix) : "";
  const precision = "[0-9]+\\.".repeat(versionFilter.precision).slice(0, -2);
  const escapedSuffix = versionFilter.suffix ? escapeForRegEx(versionFilter.suffix) : "";

  return `^${escapedPrefix}${precision}${escapedSuffix}$`;
};

interface ReleaseEditProps {
  fieldPath: string;
  repository: ReleasesRepository;
  onRepositorySave: (repository: ReleasesRepository) => FormValidation;
  versionFilterPrecisionOptions: string[];
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

  const handleChange = useCallback((changedValue: Partial<ReleasesRepository>) => {
    setTempRepository((prev) => ({ ...prev, ...changedValue }));
  }, []);

  return (
    <Stack>
      <Group align="center">
        <Select
          withAsterisk
          label={tRepository("provider.label")}
          data={Object.entries(Providers).map(([key, provider]) => ({
            value: key,
            label: provider.name,
          }))}
          value={tempRepository.providerKey}
          error={formErrors[`${innerProps.fieldPath}.providerKey`]}
          onChange={(value) => {
            if (value && Providers[value]) {
              handleChange({ providerKey: value });
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
          error={formErrors[`${innerProps.fieldPath}.identifier`]}
          style={{ flex: 1 }}
        />
      </Group>

      <Fieldset legend={tRepository("versionFilter.label")}>
        <Group justify="stretch" align="center" grow>
          <TextInput
            label={tRepository("versionFilter.prefix.label")}
            value={tempRepository.versionFilter?.prefix ?? ""}
            onChange={(event) => {
              handleChange({
                versionFilter: {
                  ...(tempRepository.versionFilter ?? { precision: 0 }),
                  prefix: event.currentTarget.value,
                },
              });
            }}
            error={formErrors[`${innerProps.fieldPath}.versionFilter.prefix`]}
            disabled={!tempRepository.versionFilter}
          />
          <Select
            label={tRepository("versionFilter.precision.label")}
            data={Object.entries(innerProps.versionFilterPrecisionOptions).map(([key, value]) => ({
              value: key,
              label: value,
            }))}
            value={tempRepository.versionFilter?.precision.toString() ?? "0"}
            onChange={(value) => {
              const precision = value ? parseInt(value) : 0;
              handleChange({
                versionFilter:
                  isNaN(precision) || precision <= 0
                    ? undefined
                    : {
                        ...(tempRepository.versionFilter ?? {}),
                        precision,
                      },
              });
            }}
            error={formErrors[`${innerProps.fieldPath}.versionFilter.precision`]}
          />
          <TextInput
            label={tRepository("versionFilter.suffix.label")}
            value={tempRepository.versionFilter?.suffix ?? ""}
            onChange={(event) => {
              handleChange({
                versionFilter: {
                  ...(tempRepository.versionFilter ?? { precision: 0 }),
                  suffix: event.currentTarget.value,
                },
              });
            }}
            error={formErrors[`${innerProps.fieldPath}.versionFilter.suffix`]}
            disabled={!tempRepository.versionFilter}
          />
        </Group>

        <Text size="xs" c="dimmed">
          {tRepository("versionFilter.regex.label")}:{" "}
          {formatVersionFilterRegex(tempRepository.versionFilter) ??
            tRepository("versionFilter.precision.options.none")}
        </Text>
      </Fieldset>

      <IconPicker
        withAsterisk={false}
        value={tempRepository.iconUrl}
        onChange={(url) => handleChange({ iconUrl: url })}
        error={formErrors[`${innerProps.fieldPath}.iconUrl`] as string}
      />

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
