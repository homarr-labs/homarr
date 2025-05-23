"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActionIcon, Button, Divider, Fieldset, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { IconEdit, IconTrash, IconTriangleFilled } from "@tabler/icons-react";
import { escapeForRegEx } from "@tiptap/react";

import { clientApi } from "@homarr/api/client";
import { findBestIconMatch, IconPicker } from "@homarr/forms-collection";
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
      form.setFieldValue(`options.${property}.${index}.name`, repository.name);
      form.setFieldValue(`options.${property}.${index}.versionFilter`, repository.versionFilter);
      form.setFieldValue(`options.${property}.${index}.iconUrl`, repository.iconUrl);

      const formValidation = form.validate();
      const fieldErrors: FormErrors = Object.entries(formValidation.errors).reduce((acc, [key, value]) => {
        if (key.startsWith(`options.${property}.${index}.`)) {
          acc[key] = value;
        }
        return acc;
      }, {} as FormErrors);

      return {
        hasErrors: Object.keys(fieldErrors).length > 0,
        errors: fieldErrors,
      };
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

    const index = repositories.length;

    openModal({
      fieldPath: `options.${property}.${index}`,
      repository: item,
      onRepositorySave: (saved) => onRepositorySave(saved, index),
      onRepositoryCancel: () => onRepositoryRemove(index),
      versionFilterPrecisionOptions,
    });
  };

  const onRepositoryRemove = (index: number) => {
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
                    {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
                    {repository.name || repository.identifier}
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

                <ActionIcon variant="transparent" color="red" onClick={() => onRepositoryRemove(index)}>
                  <IconTrash size={15} />
                </ActionIcon>
              </Group>
              {Object.keys(form.errors).filter((key) => key.startsWith(`options.${property}.${index}.`)).length > 0 && (
                <Group align="center" justify="center" gap="xs" bg="red.1">
                  <IconTriangleFilled size={15} color="var(--mantine-color-red-filled)" />
                  <Text size="sm" c="red">
                    {tRepository("invalid")}
                  </Text>
                </Group>
              )}
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

const formatIdentifierName = (identifier: string) => {
  const unformattedName = identifier.split("/").pop();
  return unformattedName?.replace(/[-_]/g, " ").replace(/(?:^\w|[A-Z]|\b\w)/g, (char) => char.toUpperCase()) ?? "";
};

interface ReleaseEditProps {
  fieldPath: string;
  repository: ReleasesRepository;
  onRepositorySave: (repository: ReleasesRepository) => FormValidation;
  onRepositoryCancel?: () => void;
  versionFilterPrecisionOptions: string[];
}

const ReleaseEditModal = createModal<ReleaseEditProps>(({ innerProps, actions }) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const [loading, setLoading] = useState(false);
  const [tempRepository, setTempRepository] = useState(() => ({ ...innerProps.repository }));
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Allows user to not select an icon by removing the url from the input,
  // will only try and get an icon if the name or identifier changes
  const [autoSetIcon, setAutoSetIcon] = useState(false);

  // Debounce the name value with 200ms delay
  const [debouncedName] = useDebouncedValue(tempRepository.name, 800);

  const handleConfirm = useCallback(() => {
    setLoading(true);

    const validation = innerProps.onRepositorySave(tempRepository);
    setFormErrors(validation.errors);
    if (!validation.hasErrors) {
      actions.closeModal();
    }

    setLoading(false);
  }, [innerProps, tempRepository, actions]);

  const handleCancel = useCallback(() => {
    if (innerProps.onRepositoryCancel) {
      innerProps.onRepositoryCancel();
    }

    actions.closeModal();
  }, [innerProps, actions]);

  const handleChange = useCallback((changedValue: Partial<ReleasesRepository>) => {
    setTempRepository((prev) => ({ ...prev, ...changedValue }));
  }, []);

  // Auto-select icon based on identifier formatted name with debounced search
  const { data: iconsData } = clientApi.icon.findIcons.useQuery(
    {
      searchText: debouncedName,
    },
    {
      enabled: autoSetIcon && (debouncedName?.length ?? 0) > 3,
    },
  );

  useEffect(() => {
    if (autoSetIcon && debouncedName && !tempRepository.iconUrl && iconsData?.icons) {
      const bestMatch = findBestIconMatch(debouncedName, iconsData.icons);
      if (bestMatch) {
        handleChange({ iconUrl: bestMatch });
      }
    }
  }, [debouncedName, iconsData, tempRepository, handleChange, autoSetIcon]);

  return (
    <Stack>
      <Group align="center" wrap="nowrap">
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
          style={{ flex: 1, flexBasis: "40%" }}
        />

        <TextInput
          withAsterisk
          label={tRepository("identifier.label")}
          value={tempRepository.identifier}
          onChange={(event) => {
            const name =
              tempRepository.name === undefined ||
              formatIdentifierName(tempRepository.identifier) === tempRepository.name
                ? formatIdentifierName(event.currentTarget.value)
                : tempRepository.name;

            handleChange({
              identifier: event.currentTarget.value,
              name,
            });

            if (event.currentTarget.value) setAutoSetIcon(true);
          }}
          error={formErrors[`${innerProps.fieldPath}.identifier`]}
          w="100%"
        />
      </Group>

      <Group align="center" wrap="nowrap">
        <TextInput
          label={tRepository("name.label")}
          value={tempRepository.name ?? ""}
          onChange={(event) => {
            handleChange({ name: event.currentTarget.value });

            if (event.currentTarget.value) setAutoSetIcon(true);
          }}
          error={formErrors[`${innerProps.fieldPath}.name`]}
          style={{ flex: 1, flexBasis: "40%" }}
        />

        <IconPicker
          withAsterisk={false}
          value={tempRepository.iconUrl ?? ""}
          onChange={(url) => {
            if (url === "") {
              setAutoSetIcon(false);
              handleChange({ iconUrl: undefined });
            } else {
              handleChange({ iconUrl: url });
            }
          }}
          error={formErrors[`${innerProps.fieldPath}.iconUrl`] as string}
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

      <Divider my={"sm"} />
      <Group justify="flex-end">
        <Button variant="default" onClick={handleCancel} color="gray.5">
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
