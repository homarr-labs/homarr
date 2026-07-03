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
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconAlertTriangleFilled,
  IconBrandDocker,
  IconCopy,
  IconCopyCheckFilled,
  IconEdit,
  IconKey,
  IconPackageImport,
  IconPlus,
  IconTrash,
  IconTriangleFilled,
  IconZoomScan,
} from "@tabler/icons-react";
import { escapeForRegEx } from "@tiptap/react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { createId } from "@homarr/common";
import type { ReleaseProviderKind } from "@homarr/definitions";
import {
  getReleaseProviderDefaultUrl,
  getReleaseProviderIconUrl,
  getReleaseProviderName,
  normalizeReleaseProviderIdentifier,
  releaseProviderKinds,
} from "@homarr/definitions";
import { findBestIconMatch, IconPicker } from "@homarr/forms-collection";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedImage } from "@homarr/ui";

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
  itemId,
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

  const providerOptions = useMemo(
    () => releaseProviderKinds.map((provider) => ({ value: provider, label: getReleaseProviderName(provider) })),
    [],
  );

  const onRepositorySave = useCallback(
    (repository: ReleasesRepository, index: number): FormValidation => {
      form.setFieldValue(`options.${property}.${index}.provider`, repository.provider);
      form.setFieldValue(`options.${property}.${index}.identifier`, repository.identifier);
      form.setFieldValue(`options.${property}.${index}.name`, repository.name);
      form.setFieldValue(`options.${property}.${index}.versionFilter`, repository.versionFilter);
      form.setFieldValue(`options.${property}.${index}.iconUrl`, repository.iconUrl);
      form.setFieldValue(`options.${property}.${index}.providerUrl`, repository.providerUrl);

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
      id: createId(),
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
      providerOptions,
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
          const providerName = repository.provider ? getReleaseProviderName(repository.provider) : "";
          return (
            <Stack key={repository.id} gap={5}>
              <Group align="center" gap="xs">
                <Image
                  src={
                    repository.iconUrl ?? (repository.provider ? getReleaseProviderIconUrl(repository.provider) : null)
                  }
                  style={{
                    height: "1.2em",
                    width: "1.2em",
                  }}
                />

                <Text c="dimmed" size="xs">
                  {providerName}
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
                      providerOptions,
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
      {itemId && <ProviderTokensSection itemId={itemId} repositories={repositories} />}
    </Fieldset>
  );
};

const providersWithAuth: ReleaseProviderKind[] = [
  "github",
  "gitHubContainerRegistry",
  "dockerHub",
  "gitlab",
  "npm",
  "codeberg",
];

const ProviderTokensSection = ({ itemId, repositories }: { itemId: string; repositories: ReleasesRepository[] }) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const { data: configuredKinds = [], refetch } = clientApi.widget.secrets.getConfiguredKinds.useQuery({ itemId });
  const setSecret = clientApi.widget.secrets.setSecret.useMutation({ onSuccess: () => refetch() });
  const deleteSecret = clientApi.widget.secrets.deleteSecret.useMutation({ onSuccess: () => refetch() });

  const authProviders = useMemo(() => {
    const usedProviders = repositories.map((r) => r.provider).filter((p): p is ReleaseProviderKind => p !== undefined);
    const configuredProviders = configuredKinds.filter((k): k is ReleaseProviderKind =>
      providersWithAuth.includes(k as ReleaseProviderKind),
    );
    return [...new Set([...usedProviders, ...configuredProviders])].filter((p) => providersWithAuth.includes(p));
  }, [repositories, configuredKinds]);

  if (authProviders.length === 0) return null;

  return (
    <>
      <Divider my="sm" label={tRepository("tokens.label")} labelPosition="center" />
      <Stack gap="xs">
        {authProviders.map((provider) => (
          <ProviderTokenInput
            key={provider}
            provider={provider}
            hasToken={configuredKinds.includes(provider)}
            onSave={async (value) => {
              await setSecret.mutateAsync({ itemId, kind: provider, value });
            }}
            onDelete={async () => {
              await deleteSecret.mutateAsync({ itemId, kind: provider });
            }}
          />
        ))}
      </Stack>
    </>
  );
};

const ProviderTokenInput = ({
  provider,
  hasToken,
  onSave,
  onDelete,
}: {
  provider: ReleaseProviderKind;
  hasToken: boolean;
  onSave: (value: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(value.trim());
      setValue("");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete();
      setValue("");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Group gap="xs" align="end">
      <PasswordInput
        label={`${getReleaseProviderName(provider)} ${tRepository("tokens.token")}`}
        placeholder={hasToken ? tRepository("tokens.configured") : tRepository("tokens.notConfigured")}
        value={value}
        onChange={(e) => {
          setValue(e.currentTarget.value);
          setEditing(true);
        }}
        style={{ flex: 1 }}
        size="xs"
        leftSection={<IconKey size={14} />}
      />
      {editing && value.trim() && (
        <Button size="xs" onClick={handleSave} loading={saving}>
          {tRepository("tokens.save")}
        </Button>
      )}
      {hasToken && !editing && (
        <ActionIcon variant="light" color="red" size="sm" onClick={handleDelete} loading={saving}>
          <IconTrash size={14} />
        </ActionIcon>
      )}
    </Group>
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
  providerOptions: { value: ReleaseProviderKind; label: string }[];
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
      <Group align="start" wrap="nowrap" grow preventGrowOverflow={false}>
        <div style={{ flex: 0.3 }}>
          <Select
            withAsterisk
            label={tRepository("provider.label")}
            data={innerProps.providerOptions}
            value={tempRepository.provider ?? null}
            error={formErrors[`${innerProps.fieldPath}.provider`] as string}
            onChange={(value) => {
              handleChange({ provider: value ? (value as ReleaseProviderKind) : undefined });
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

      <TextInput
        label={tRepository("providerUrl.label")}
        placeholder={tempRepository.provider ? getReleaseProviderDefaultUrl(tempRepository.provider) : undefined}
        value={tempRepository.providerUrl ?? ""}
        onChange={(event) => {
          handleChange({ providerUrl: event.currentTarget.value || undefined });
        }}
        error={formErrors[`${innerProps.fieldPath}.providerUrl`]}
      />

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
                        ...tempRepository.versionFilter,
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

interface ImportRepositorySelectProps {
  repository: ReleasesRepositoryImport;
  checked: boolean;
  versionFilterPrecisionOptions: string[];
  disabled: boolean;
  onImageSelectionChanged?: (isSelected: boolean) => void;
}

const ImportRepositorySelect = ({
  repository,
  checked,
  versionFilterPrecisionOptions,
  disabled = false,
  onImageSelectionChanged = undefined,
}: ImportRepositorySelectProps) => {
  const tRepository = useScopedI18n("widget.releases.option.repositories");
  const provider = repository.provider;

  return (
    <Group gap="xl" justify="space-between">
      <Group gap="md" align="center">
        <Checkbox
          checked={checked}
          disabled={disabled}
          readOnly={disabled}
          onChange={() => {
            if (onImageSelectionChanged) {
              onImageSelectionChanged(!checked);
            }
          }}
          label={
            <Group align="center">
              <Image
                src={repository.iconUrl}
                style={{
                  height: "1.2em",
                  width: "1.2em",
                }}
              />
              <Text>{repository.identifier}</Text>
            </Group>
          }
        />

        {repository.versionFilter && (
          <Group gap={5}>
            <Text c="dimmed" size="xs">
              {tRepository("versionFilter.label")}:
            </Text>

            <Code>{repository.versionFilter.prefix}</Code>
            <Code color="var(--mantine-primary-color-light)" fw={700}>
              {versionFilterPrecisionOptions[repository.versionFilter.precision]}
            </Code>
            <Code>{repository.versionFilter.suffix}</Code>
          </Group>
        )}
      </Group>

      <Tooltip label={tRepository("noProvider.tooltip")} disabled={provider !== undefined} withArrow>
        <Group>
          {provider ? (
            <MaskedImage
              color="dimmed"
              imageUrl={getReleaseProviderIconUrl(provider)}
              style={{
                height: "1em",
                width: "1em",
              }}
            />
          ) : (
            <IconAlertTriangleFilled />
          )}

          <Text ff="monospace" c="dimmed" size="sm">
            {provider ? getReleaseProviderName(provider) : tRepository("noProvider.label")}
          </Text>
        </Group>
      </Tooltip>
    </Group>
  );
};

interface RepositoryImportProps {
  repositories: ReleasesRepository[];
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
    enabled: innerProps.isAdmin,
  });

  const importRepositories: ReleasesRepositoryImport[] = useMemo(
    () =>
      docker.data?.containers.reduce<ReleasesRepositoryImport[]>((acc, container) => {
        const [maybeSource, maybeIdentifierAndVersion] = container.image.split(/\/(.*)/);
        const hasSource = maybeSource && maybeSource in containerImageToProviderKind;
        const source = hasSource ? maybeSource : "docker.io";
        const [identifier, version] =
          hasSource && maybeIdentifierAndVersion ? maybeIdentifierAndVersion.split(":") : container.image.split(":");

        if (!identifier) return acc;

        const provider = containerImageToProviderKind[source] ?? "dockerHub";
        const normalizedIdentifier = normalizeReleaseProviderIdentifier(provider, identifier);

        if (acc.some((item) => item.provider === provider && item.identifier === normalizedIdentifier)) return acc;

        acc.push({
          id: createId(),
          provider,
          identifier: normalizedIdentifier,
          iconUrl: container.iconUrl ?? undefined,
          name: formatIdentifierName(normalizedIdentifier),
          versionFilter: version ? parseImageVersionToVersionFilter(version) : undefined,
          alreadyImported: innerProps.repositories.some(
            (item) => item.provider === provider && item.identifier === normalizedIdentifier,
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
    () => importRepositories.every((repository) => repository.alreadyImported),
    [importRepositories],
  );

  const anyImagesImported = useMemo(
    () => importRepositories.some((repository) => repository.alreadyImported),
    [importRepositories],
  );

  return (
    <Stack>
      {docker.isPending ? (
        <Stack justify="center" align="center">
          <Loader size="xl" />
          <Title order={3}>{tRepository("importRepositories.loading")}</Title>
        </Stack>
      ) : importRepositories.length === 0 ? (
        <Stack justify="center" align="center">
          <IconBrandDocker stroke={1} size={128} />
          <Title order={3}>{tRepository("importRepositories.noImagesFound")}</Title>
        </Stack>
      ) : (
        <Stack>
          <Accordion defaultValue={!allImagesImported ? "foundImages" : anyImagesImported ? "alreadyImported" : ""}>
            <Accordion.Item value="foundImages">
              <Accordion.Control disabled={allImagesImported} icon={<IconZoomScan />}>
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
                {!allImagesImported && (
                  <Stack justify="center" gap="xs">
                    <Group>
                      <Button
                        leftSection={<IconCopyCheckFilled size="1em" />}
                        onClick={() =>
                          setSelectedImages(importRepositories.filter((repository) => !repository.alreadyImported))
                        }
                        size="xs"
                      >
                        {tRepository("importRepositories.selectAll")}
                      </Button>
                      <Button
                        leftSection={<IconCopy size="1em" />}
                        onClick={() => setSelectedImages([])}
                        size="xs"
                        variant="default"
                        color="gray.5"
                      >
                        {tRepository("importRepositories.deselectAll")}
                      </Button>
                    </Group>

                    <Divider />

                    {importRepositories
                      .filter((repository) => !repository.alreadyImported)
                      .map((repository) => (
                        <ImportRepositorySelect
                          key={repository.id}
                          repository={repository}
                          checked={selectedImages.includes(repository)}
                          versionFilterPrecisionOptions={innerProps.versionFilterPrecisionOptions}
                          disabled={false}
                          onImageSelectionChanged={(isSelected) =>
                            isSelected
                              ? setSelectedImages([...selectedImages, repository])
                              : setSelectedImages(selectedImages.filter((img) => img !== repository))
                          }
                        />
                      ))}
                  </Stack>
                )}
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="alreadyImported">
              <Accordion.Control disabled={!anyImagesImported} icon={<IconPackageImport />}>
                {tRepository("importRepositories.listAlreadyImportedImages")}
              </Accordion.Control>
              <Accordion.Panel>
                {anyImagesImported && (
                  <Stack justify="center" gap="xs">
                    {importRepositories
                      .filter((repository) => repository.alreadyImported)
                      .map((repository) => (
                        <ImportRepositorySelect
                          key={repository.id}
                          repository={repository}
                          versionFilterPrecisionOptions={innerProps.versionFilterPrecisionOptions}
                          checked
                          disabled
                        />
                      ))}
                  </Stack>
                )}
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

const containerImageToProviderKind: Record<string, ReleaseProviderKind> = {
  "ghcr.io": "gitHubContainerRegistry",
  "docker.io": "dockerHub",
  "lscr.io": "linuxServerIO",
  "quay.io": "quay",
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
