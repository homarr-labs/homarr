"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Fieldset,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { IconBrandDocker, IconEdit, IconPlus, IconTrash, IconTriangleFilled } from "@tabler/icons-react";
import { escapeForRegEx } from "@tiptap/react";

import { clientApi } from "@homarr/api/client";
import { findBestIconMatch, IconPicker } from "@homarr/forms-collection";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { isProviderKey, Providers } from "../releases/releases-providers";
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
  const { openModal: openEditModal } = useModalAction(RepositoryEditModal);
  const { openModal: openImportModal } = useModalAction(RepositoryImportModal);
  const versionFilterPrecisionOptions = useMemo(
    () => [tRepository("versionFilter.precision.options.none"), "#", "#.#", "#.#.#", "#.#.#.#", "#.#.#.#.#"],
    [tRepository],
  );
  const { data: docker } = clientApi.docker.getContainers.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

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

  const addNewRepository = () => {
    const repository: ReleasesRepository = {
      providerKey: "DockerHub",
      identifier: "",
    };

    form.setValues((previous) => {
      const previousValues = previous.options?.[property] as ReleasesRepository[];
      return {
        ...previous,
        options: {
          ...previous.options,
          [property]: [...previousValues, repository],
        },
      };
    });

    const index = repositories.length;

    openEditModal({
      fieldPath: `options.${property}.${index}`,
      repository,
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

  const importNewRepository = () => {
    const containersImage: ReleasesRepositoryImport[] | undefined = docker?.containers.reduce<
      ReleasesRepositoryImport[]
    >((acc, containerImage) => {
      const providerKey = containerImage.image.startsWith("ghcr.io/") ? "Github" : "DockerHub";
      const [identifier, version] = containerImage.image.replace(/^(ghcr\.io\/|docker\.io\/)/, "").split(":");

      if (!identifier) return acc;

      if (acc.some((item) => item.providerKey === providerKey && item.identifier === identifier)) return acc;

      acc.push({
        providerKey,
        identifier,
        iconUrl: containerImage.iconUrl ?? undefined,
        name: formatIdentifierName(identifier),
        versionFilter: version ? parseImageVersionToVersionFilter(version) : undefined,
        isDisabled: repositories.some((item) => item.providerKey === providerKey && item.identifier === identifier),
      });
      return acc;
    }, []);

    if (containersImage) {
      openImportModal({
        containersImage,
        versionFilterPrecisionOptions,
        onConfirm: (selectedRepositories) => {
          if (!selectedRepositories.length) return;

          form.setValues((previous) => {
            const previousValues = previous.options?.[property] as ReleasesRepository[];
            return {
              ...previous,
              options: {
                ...previous.options,
                [property]: [...previousValues, ...selectedRepositories],
              },
            };
          });
        },
      });
    }
  };

  return (
    <Fieldset legend={t("label")}>
      <Stack gap="5">
        <Group grow>
          <Button leftSection={<IconPlus />} onClick={addNewRepository}>
            {tRepository("addRRepository.label")}
          </Button>
          <Button
            leftSection={docker?.containers.length && <IconBrandDocker />}
            onClick={importNewRepository}
            disabled={!docker?.containers.length}
          >
            {!docker?.containers.length ? (
              <Group gap="xs">
                <Loader size="xs" color="gray" />
                <Text>{tRepository("importRepositories.loading")}</Text>
              </Group>
            ) : (
              tRepository("importRepositories.label")
            )}
          </Button>
        </Group>
        <Divider my="sm" />

        {repositories.map((repository, index) => {
          return (
            <Stack key={`${repository.providerKey}.${repository.identifier}`} gap={5}>
              <Group align="center" gap="xs">
                <MaskedOrNormalImage
                  hasColor={false}
                  imageUrl={repository.iconUrl ?? Providers[repository.providerKey].iconUrl}
                  style={{
                    height: "1.2em",
                    width: "1.2em",
                  }}
                />

                <Text c="dimmed" fw={100} size="xs">
                  {Providers[repository.providerKey].name}
                </Text>

                <Group justify="space-between" align="center" style={{ flex: 1 }} gap={5}>
                  <Text size="sm" style={{ flex: 1, whiteSpace: "nowrap" }}>
                    {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
                    {repository.name || repository.identifier}
                  </Text>
                </Group>

                <Button
                  onClick={() =>
                    openEditModal({
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

const parseImageVersionToVersionFilter = (imageVersion: string): ReleasesVersionFilter | undefined => {
  const version = /(?<=\D|^)\d+(?:\.\d+)*(?![\d.])/.exec(imageVersion)?.[0];

  if (!version) return undefined;

  const [prefix, suffix] = imageVersion.split(version);

  return {
    prefix,
    precision: version.split(".").length,
    suffix,
  };
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

interface RepositoryEditProps {
  fieldPath: string;
  repository: ReleasesRepository;
  onRepositorySave: (repository: ReleasesRepository) => FormValidation;
  onRepositoryCancel?: () => void;
  versionFilterPrecisionOptions: string[];
}

const RepositoryEditModal = createModal<RepositoryEditProps>(({ innerProps, actions }) => {
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
            if (value && isProviderKey(value)) {
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

        <Button data-autofocus onClick={handleConfirm} loading={loading}>
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

interface ReleasesRepositoryImport extends ReleasesRepository {
  isDisabled: boolean;
}

interface RepositoryImportProps {
  containersImage: ReleasesRepositoryImport[];
  versionFilterPrecisionOptions: string[];
  onConfirm: (containersImage: ReleasesRepositoryImport[]) => void;
}

const RepositoryImportModal = createModal<RepositoryImportProps>(({ innerProps, actions }) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([] as ReleasesRepositoryImport[]);

  const handleConfirm = useCallback(() => {
    setLoading(true);

    innerProps.onConfirm(selectedImages);

    setLoading(false);
    actions.closeModal();
  }, [innerProps, selectedImages, actions]);

  return (
    <Stack>
      {innerProps.containersImage.map((containerImage) => {
        return (
          <Group
            key={`${Providers[containerImage.providerKey].name}/${containerImage.identifier}`}
            gap="xl"
            justify="space-between"
          >
            <Group gap="md">
              <Tooltip
                label={tRepository("importRepositories.importDisabled.tooltip")}
                withArrow
                disabled={!containerImage.isDisabled}
              >
                <Checkbox
                  disabled={containerImage.isDisabled}
                  label={
                    <Group>
                      <MaskedOrNormalImage
                        hasColor={false}
                        imageUrl={containerImage.iconUrl}
                        style={{
                          height: "1.2em",
                          width: "1.2em",
                        }}
                      />
                      <Text>{containerImage.identifier}</Text>
                    </Group>
                  }
                  onChange={(event) =>
                    event.currentTarget.checked
                      ? setSelectedImages([...selectedImages, containerImage])
                      : setSelectedImages(selectedImages.filter((img) => img !== containerImage))
                  }
                />
              </Tooltip>

              {containerImage.versionFilter && (
                <Group gap={5}>
                  <Text c="dimmed" size="xs">
                    Version Fitler:
                  </Text>
                  {containerImage.versionFilter.prefix && <Text c="dimmed">{containerImage.versionFilter.prefix}</Text>}
                  <Text c="dimmed" fw={700}>
                    {innerProps.versionFilterPrecisionOptions[containerImage.versionFilter.precision]}
                  </Text>
                  {containerImage.versionFilter.suffix && <Text c="dimmed">{containerImage.versionFilter.suffix}</Text>}
                </Group>
              )}
            </Group>

            <Group>
              <MaskedOrNormalImage
                hasColor
                color="dimmed"
                imageUrl={Providers[containerImage.providerKey].iconUrl}
                style={{
                  height: "1em",
                  width: "1em",
                }}
              />
              <Text ff="monospace" c="dimmed" size="sm">
                {Providers[containerImage.providerKey].name}
              </Text>
            </Group>
          </Group>
        );
      })}

      <Divider my={"sm"} />
      <Group justify="flex-end">
        <Button variant="default" onClick={actions.closeModal} color="gray.5">
          {tRepository("editForm.cancel.label")}
        </Button>

        <Button data-autofocus onClick={handleConfirm} loading={loading}>
          {tRepository("editForm.confirm.label")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle(t) {
    return t("widget.releases.option.repositories.importForm.title");
  },
  size: "xl",
});
