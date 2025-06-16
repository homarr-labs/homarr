"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Button,
  Checkbox,
  Code,
  Divider,
  Fieldset,
  Group,
  Image,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import type { CheckboxProps } from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { randomId, useDebouncedValue } from "@mantine/hooks";
import {
  IconAlertTriangleFilled,
  IconBrandDocker,
  IconEdit,
  IconPlus,
  IconSquare,
  IconSquareCheck,
  IconTrash,
  IconTriangleFilled,
} from "@tabler/icons-react";
import { escapeForRegEx } from "@tiptap/react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { getIconUrl } from "@homarr/definitions";
import { findBestIconMatch, IconPicker } from "@homarr/forms-collection";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedImage } from "@homarr/ui";

import type { ReleasesRepository, ReleasesVersionFilter } from "../releases/releases-repository";
import { WidgetIntegrationSelect } from "../widget-integration-select";
import type { IntegrationSelectOption } from "../widget-integration-select";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

interface FormValidation {
  hasErrors: boolean;
  errors: FormErrors;
}

interface Integration extends IntegrationSelectOption {
  iconUrl: string;
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
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;

  const integrationsApi = clientApi.integration.allOfGivenCategory.useQuery(
    {
      category: "releasesProvider",
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const integrations = useMemo(
    () =>
      integrationsApi.data?.reduce<Record<string, Integration>>((acc, integration) => {
        acc[integration.id] = {
          id: integration.id,
          name: integration.name,
          url: integration.url,
          kind: integration.kind,
          iconUrl: getIconUrl(integration.kind),
        };
        return acc;
      }, {}) ?? {},
    [integrationsApi],
  );

  const onRepositorySave = useCallback(
    (repository: ReleasesRepository, index: number): FormValidation => {
      form.setFieldValue(`options.${property}.${index}.providerIntegrationId`, repository.providerIntegrationId);
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
      id: randomId(),
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
      integrations,
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
        <Group grow>
          <Button leftSection={<IconPlus />} onClick={addNewRepository}>
            {tRepository("addRepository.label")}
          </Button>
          <Tooltip label={tRepository("importRepositories.onlyAdminCanImport")} disabled={isAdmin} withArrow>
            <Button
              disabled={!isAdmin}
              leftSection={<IconBrandDocker stroke={1.25} />}
              onClick={() =>
                openImportModal({
                  repositories,
                  integrations,
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
                  isAdmin,
                })
              }
            >
              {tRepository("importRepositories.label")}
            </Button>
          </Tooltip>
        </Group>
        <Divider my="sm" />

        {repositories.map((repository, index) => {
          const integration = repository.providerIntegrationId
            ? integrations[repository.providerIntegrationId]
            : undefined;
          return (
            <Stack key={repository.id} gap={5}>
              <Group align="center" gap="xs">
                <Image
                  src={repository.iconUrl ?? integration?.iconUrl ?? null}
                  style={{
                    height: "1.2em",
                    width: "1.2em",
                  }}
                />

                <Text c="dimmed" fw={100} size="xs">
                  {integration?.name ?? ""}
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
                      integrations,
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

interface RepositoryEditProps {
  fieldPath: string;
  repository: ReleasesRepository;
  onRepositorySave: (repository: ReleasesRepository) => FormValidation;
  onRepositoryCancel?: () => void;
  versionFilterPrecisionOptions: string[];
  integrations: Record<string, Integration>;
}

const RepositoryEditModal = createModal<RepositoryEditProps>(({ innerProps, actions }) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const [loading, setLoading] = useState(false);
  const [tempRepository, setTempRepository] = useState(() => ({ ...innerProps.repository }));
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const integrationSelectOptions: IntegrationSelectOption[] = useMemo(
    () => Object.values(innerProps.integrations),
    [innerProps.integrations],
  );
  console.log(innerProps.integrations);
  console.log(integrationSelectOptions);
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
      <Group align="start" wrap="nowrap" grow preventGrowOverflow={false}>
        <div style={{ flex: 0.3 }}>
          <WidgetIntegrationSelect
            canSelectMultiple={false}
            withAsterisk
            label={tRepository("provider.label")}
            data={integrationSelectOptions}
            value={tempRepository.providerIntegrationId ? [tempRepository.providerIntegrationId] : []}
            error={formErrors[`${innerProps.fieldPath}.providerIntegrationId`] as string}
            onChange={(value) => {
              handleChange({ providerIntegrationId: value.length > 0 ? value[0] : undefined });
            }}
          />
        </div>

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
          style={{ flex: 0.7 }}
        />
      </Group>

      <Group align="center" wrap="nowrap" grow preventGrowOverflow={false}>
        <TextInput
          label={tRepository("name.label")}
          value={tempRepository.name ?? ""}
          onChange={(event) => {
            handleChange({ name: event.currentTarget.value });

            if (event.currentTarget.value) setAutoSetIcon(true);
          }}
          error={formErrors[`${innerProps.fieldPath}.name`]}
          style={{ flex: 0.3 }}
        />

        <div style={{ flex: 0.7 }}>
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
        </div>
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
  alreadyImported: boolean;
}

interface ContainerImageSelectorProps {
  containerImage: ReleasesRepositoryImport;
  integration?: Integration;
  versionFilterPrecisionOptions: string[];
  onImageSelectionChanged?: (isSelected: boolean) => void;
}

const ContainerImageSelector = ({
  containerImage,
  integration,
  versionFilterPrecisionOptions,
  onImageSelectionChanged,
}: ContainerImageSelectorProps) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const checkBoxProps: CheckboxProps = !onImageSelectionChanged
    ? {
        disabled: true,
        checked: true,
      }
    : {
        onChange: (event) => onImageSelectionChanged(event.currentTarget.checked),
      };

  return (
    <Group gap="xl" justify="space-between">
      <Group gap="md">
        <Checkbox
          label={
            <Group>
              <Image
                src={containerImage.iconUrl}
                style={{
                  height: "1.2em",
                  width: "1.2em",
                }}
              />
              <Text>{containerImage.identifier}</Text>
            </Group>
          }
          {...checkBoxProps}
        />

        {containerImage.versionFilter && (
          <Group gap={5}>
            <Text c="dimmed" size="xs">
              {tRepository("versionFilter.label")}:
            </Text>

            <Code>{containerImage.versionFilter.prefix && containerImage.versionFilter.prefix}</Code>
            <Code color="var(--mantine-primary-color-light)" fw={700}>
              {versionFilterPrecisionOptions[containerImage.versionFilter.precision]}
            </Code>
            <Code>{containerImage.versionFilter.suffix && containerImage.versionFilter.suffix}</Code>
          </Group>
        )}
      </Group>

      <Tooltip label={tRepository("noProvider.tooltip")} disabled={!integration}>
        <Group>
          {integration ? (
            <MaskedImage
              color="dimmed"
              imageUrl={integration.iconUrl}
              style={{
                height: "1em",
                width: "1em",
              }}
            />
          ) : (
            <IconAlertTriangleFilled />
          )}

          <Text ff="monospace" c="dimmed" size="sm">
            {integration?.name ?? tRepository("noProvider.label")}
          </Text>
        </Group>
      </Tooltip>
    </Group>
  );
};

interface RepositoryImportProps {
  repositories: ReleasesRepository[];
  integrations: Record<string, Integration>;
  versionFilterPrecisionOptions: string[];
  onConfirm: (selectedRepositories: ReleasesRepositoryImport[]) => void;
  isAdmin: boolean;
}

const RepositoryImportModal = createModal<RepositoryImportProps>(({ innerProps, actions }) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([] as ReleasesRepositoryImport[]);

  const docker = clientApi.docker.getContainers.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: innerProps.isAdmin,
  });

  const containersImages: ReleasesRepositoryImport[] = useMemo(
    () =>
      docker.data?.containers.reduce<ReleasesRepositoryImport[]>((acc, containerImage) => {
        const providerKey = containerImage.image.startsWith("ghcr.io/") ? "Github" : "DockerHub";
        const [identifier, version] = containerImage.image.replace(/^(ghcr\.io\/|docker\.io\/)/, "").split(":");

        if (!identifier) return acc;

        if (acc.some((item) => item.providerKey === providerKey && item.identifier === identifier)) return acc;

        //TODO: Work out how to map the container image url into integrations, there cloud be many integrations for Github for example
        acc.push({
          id: randomId(),
          providerKey,
          identifier,
          iconUrl: containerImage.iconUrl ?? undefined,
          name: formatIdentifierName(identifier),
          versionFilter: version ? parseImageVersionToVersionFilter(version) : undefined,
          alreadyImported: innerProps.repositories.some(
            (item) => item.providerKey === providerKey && item.identifier === identifier,
          ),
        });
        return acc;
      }, []) ?? [],
    [docker.data, innerProps.repositories],
  );

  const handleConfirm = useCallback(() => {
    setLoading(true);

    innerProps.onConfirm(selectedImages);

    setLoading(false);
    actions.closeModal();
  }, [innerProps, selectedImages, actions]);

  const allImagesImported = useMemo(
    () => containersImages.every((containerImage) => containerImage.alreadyImported),
    [containersImages],
  );

  const anyImagesImported = useMemo(
    () => containersImages.some((containerImage) => containerImage.alreadyImported),
    [containersImages],
  );

  return (
    <Stack>
      {docker.isPending ? (
        <Stack justify="center" align="center">
          <Loader size="xl" />
          <Title order={3}>{tRepository("importRepositories.loading")}</Title>
        </Stack>
      ) : containersImages.length === 0 ? (
        <Stack justify="center" align="center">
          <IconBrandDocker stroke={1} size={128} />
          <Title order={3}>{tRepository("importRepositories.noImagesFound")}</Title>
        </Stack>
      ) : (
        <Stack>
          <Accordion defaultValue={!allImagesImported ? "foundImages" : anyImagesImported ? "alreadyImported" : ""}>
            <Accordion.Item value="foundImages">
              <Accordion.Control disabled={allImagesImported} icon={<IconSquare stroke={1.25} />}>
                <Group>
                  {tRepository("importRepositories.listFoundImages")}
                  {allImagesImported && (
                    <Text c="dimmed" size="sm">
                      {tRepository("importRepositories.allImagesAlreadyImported")}
                    </Text>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {!allImagesImported &&
                  containersImages
                    .filter((containerImage) => !containerImage.alreadyImported)
                    .map((containerImage) => {
                      const integration = containerImage.providerIntegrationId
                        ? innerProps.integrations[containerImage.providerIntegrationId]
                        : undefined;

                      return (
                        <ContainerImageSelector
                          key={containerImage.id}
                          containerImage={containerImage}
                          integration={integration}
                          versionFilterPrecisionOptions={innerProps.versionFilterPrecisionOptions}
                          onImageSelectionChanged={(isSelected) =>
                            isSelected
                              ? setSelectedImages([...selectedImages, containerImage])
                              : setSelectedImages(selectedImages.filter((img) => img !== containerImage))
                          }
                        />
                      );
                    })}
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="alreadyImported">
              <Accordion.Control disabled={!anyImagesImported} icon={<IconSquareCheck stroke={1.25} />}>
                {tRepository("importRepositories.listAlreadyImportedImages")}
              </Accordion.Control>
              <Accordion.Panel>
                {anyImagesImported &&
                  containersImages
                    .filter((containerImage) => containerImage.alreadyImported)
                    .map((containerImage) => {
                      const integration = containerImage.providerIntegrationId
                        ? innerProps.integrations[containerImage.providerIntegrationId]
                        : undefined;

                      return (
                        <ContainerImageSelector
                          key={containerImage.id}
                          containerImage={containerImage}
                          integration={integration}
                          versionFilterPrecisionOptions={innerProps.versionFilterPrecisionOptions}
                        />
                      );
                    })}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      )}

      <Group justify="flex-end">
        <Button variant="default" onClick={actions.closeModal} color="gray.5">
          {tRepository("editForm.cancel.label")}
        </Button>

        <Button onClick={handleConfirm} loading={loading} disabled={selectedImages.length === 0}>
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
