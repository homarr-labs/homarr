"use client";

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { createId, isRecord } from "@homarr/common";
import type { ReleaseProviderKind } from "@homarr/definitions";
import {
  getReleaseProviderDefaultUrl,
  getReleaseProviderIconUrl,
  getReleaseProviderName,
  normalizeReleaseProviderIdentifier,
  releaseProviderKinds,
} from "@homarr/definitions";
import { IconPicker } from "@homarr/forms-collection";
import { createModal, useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { MaskedImage } from "@homarr/ui";

import type { ReleasesRepository, ReleasesVersionFilter } from "../releases/releases-repository";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import { useStaticWidgetInputOwner } from "./static-owner";
import {
  captureLegacyWidgetSession,
  isLegacyWidgetSessionCurrent,
  useLegacyWidgetIconResources,
} from "./widget-app-input";

interface FormValidation {
  hasErrors: boolean;
  errors: FormErrors;
}

const escapeForRegEx = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const WidgetMultiReleasesRepositoriesInput = ({
  property,
  kind,
  itemId,
  boardId,
}: CommonWidgetInputProps<"multiReleasesRepositories">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tRepository = useI18n("widget.releases.option.repositories");
  const actionT = useI18n("common.action");
  const form = useFormContext();
  const repositories = form.values.options[property] as ReleasesRepository[];
  const { openModal: openEditModal } = useModalAction(RepositoryEditModal);
  const { openModal: openImportModal } = useModalAction(RepositoryImportModal);
  const versionFilterPrecisionOptions = useMemo(
    () => [tRepository("versionFilter.precision.options.none"), "#", "#.#", "#.#.#", "#.#.#.#", "#.#.#.#.#"],
    [tRepository],
  );
  const observedSession = useSession();
  const session = observedSession.data;
  const sourceOwner = useStaticWidgetInputOwner(kind, property);
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

    openRepository(repository, index, true);
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

  const binding = useMemo(() => ({ kind, property, itemId, boardId }), [kind, property, itemId, boardId]);
  const mount = useRef<{ active: boolean } | null>(null);
  const host = useRef({ binding, form, session: observedSession, sourceOwner, onRepositorySave, onRepositoryRemove });
  const selection = useRef<{
    active: boolean;
    seen: boolean;
    index: number;
    id: string;
    fields: string;
    binding: typeof binding;
    session: ReturnType<typeof captureLegacyWidgetSession>;
  } | null>(null);
  useLayoutEffect(() => {
    const lease = { active: true };
    mount.current = lease;
    return () => {
      lease.active = false;
      if (selection.current) selection.current.active = false;
    };
  }, []);
  useLayoutEffect(() => {
    host.current = { binding, form, session: observedSession, sourceOwner, onRepositorySave, onRepositoryRemove };
    const origin = selection.current;
    if (!origin) return;
    if (origin.binding !== binding || !isLegacyWidgetSessionCurrent(origin.session, observedSession))
      origin.active = false;
    const rows = form.values.options[property];
    if (Array.isArray(rows)) {
      const row: unknown = rows[origin.index];
      if (isRecord(row) && row.id === origin.id && JSON.stringify(row) === origin.fields) origin.seen = true;
      else if (origin.seen) origin.active = false;
    } else if (origin.seen) origin.active = false;
  });
  const openRepository = (repository: ReleasesRepository, index: number, isNew: boolean) => {
    const current = host.current;
    const lease = mount.current;
    if (
      !lease?.active ||
      current.binding !== binding ||
      !current.sourceOwner.isCurrent() ||
      current.session.status !== "authenticated"
    )
      return;
    if (selection.current) selection.current.active = false;
    const origin = {
      active: true,
      seen: !isNew,
      index,
      id: repository.id,
      fields: JSON.stringify(repository),
      binding,
      session: captureLegacyWidgetSession(current.session.data),
    };
    selection.current = origin;
    const isCurrentSource = () => {
      const valid =
        origin.active &&
        origin.seen &&
        selection.current === origin &&
        lease.active &&
        mount.current === lease &&
        host.current.binding === binding &&
        isLegacyWidgetSessionCurrent(origin.session, host.current.session);
      if (!valid && origin.seen) origin.active = false;
      return valid;
    };
    const props: RepositoryEditProps = {
      fieldPath: `options.${property}.${index}`,
      repository: { ...repository },
      session: origin.session,
      isCurrentSource,
      onRepositorySave: (saved) => {
        if (!isCurrentSource())
          return { hasErrors: true, errors: { [`options.${property}.${index}`]: "Repository selection retired" } };
        const form = host.current.form;
        const beforeRows = form.getValues().options[property];
        const before: unknown = Array.isArray(beforeRows) ? beforeRows[index] : undefined;
        if (!isRecord(before) || before.id !== origin.id || JSON.stringify(before) !== origin.fields) {
          origin.active = false;
          return { hasErrors: true, errors: { [`options.${property}.${index}`]: "Repository selection changed" } };
        }
        const controlled = ["provider", "identifier", "name", "versionFilter", "iconUrl", "providerUrl"];
        const untouched = JSON.stringify(Object.entries(before).filter(([key]) => !controlled.includes(key)));
        const validation = host.current.onRepositorySave(saved, index);
        const afterRows = form.getValues().options[property];
        const after: unknown = Array.isArray(afterRows) ? afterRows[index] : undefined;
        if (
          !isCurrentSource() ||
          !isRecord(after) ||
          after.id !== origin.id ||
          after.provider !== saved.provider ||
          after.identifier !== saved.identifier ||
          after.name !== saved.name ||
          JSON.stringify(after.versionFilter) !== JSON.stringify(saved.versionFilter) ||
          after.iconUrl !== saved.iconUrl ||
          after.providerUrl !== saved.providerUrl ||
          JSON.stringify(Object.entries(after).filter(([key]) => !controlled.includes(key))) !== untouched
        ) {
          origin.active = false;
          return {
            hasErrors: true,
            errors: { ...validation.errors, [`options.${property}.${index}`]: "Repository selection changed" },
          };
        }
        origin.fields = JSON.stringify(after);
        return validation;
      },
      versionFilterPrecisionOptions,
      providerOptions,
    };
    if (isNew)
      props.onRepositoryCancel = () => {
        if (isCurrentSource()) host.current.onRepositoryRemove(index);
      };
    openEditModal(props);
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
                  onClick={() => openRepository(repository, index, false)}
                  variant="light"
                  leftSection={<IconEdit size="var(--mantine-font-size-sm)" />}
                  size="xs"
                >
                  {actionT("edit")}
                </Button>

                <ActionIcon variant="transparent" color="red" onClick={() => onRepositoryRemove(index)}>
                  <IconTrash size="var(--mantine-font-size-sm)" />
                </ActionIcon>
              </Group>
              {Object.keys(form.errors).filter((key) => key.startsWith(`options.${property}.${index}.`)).length > 0 && (
                <Group align="center" justify="center" gap="xs" bg="red.1">
                  <IconTriangleFilled size="var(--mantine-font-size-sm)" color="var(--mantine-color-red-filled)" />
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
  const tRepository = useI18n("widget.releases.option.repositories");
  const utils = clientApi.useUtils();
  const { data: configuredKinds = [], refetch } = clientApi.widget.secrets.getConfiguredKinds.useQuery({ itemId });
  const setSecret = clientApi.widget.secrets.setSecret.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.widget.releases.getLatest.invalidate();
    },
    onError: () => {
      showErrorNotification({
        title: tRepository("tokens.label"),
        message: tRepository("tokens.notConfigured"),
      });
    },
  });
  const deleteSecret = clientApi.widget.secrets.deleteSecret.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.widget.releases.getLatest.invalidate();
    },
    onError: () => {
      showErrorNotification({
        title: tRepository("tokens.label"),
        message: tRepository("tokens.notConfigured"),
      });
    },
  });

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
  const tRepository = useI18n("widget.releases.option.repositories");
  const actionT = useI18n("common.action");
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
        leftSection={<IconKey size="var(--mantine-font-size-sm)" />}
      />
      {editing && value.trim() && (
        <Button size="xs" onClick={handleSave} loading={saving}>
          {actionT("save")}
        </Button>
      )}
      {hasToken && !editing && (
        <ActionIcon variant="light" color="red" size="sm" onClick={handleDelete} loading={saving}>
          <IconTrash size="var(--mantine-font-size-sm)" />
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
  session: ReturnType<typeof captureLegacyWidgetSession>;
  isCurrentSource: () => boolean;
}

function RepositoryEditContent({
  innerProps,
  actions,
}: {
  innerProps: RepositoryEditProps;
  actions: { closeModal: () => void; capturePresentationOwner: () => { isCurrent: () => boolean } };
}) {
  const tRepository = useI18n("widget.releases.option.repositories");
  const actionT = useI18n("common.action");
  const [loading, setLoading] = useState(false);
  const [tempRepository, setTempRepository] = useState(() => ({ ...innerProps.repository }));
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const session = useSession();
  const owner = useRef<{ active: boolean; admitted: boolean; presentation: { isCurrent: () => boolean } } | null>(null);
  const host = useRef({ innerProps, session, tempRepository });
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const lease = { active: true, admitted: false, presentation: actions.capturePresentationOwner() };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, []);
  useLayoutEffect(() => {
    host.current = { innerProps, session, tempRepository };
    const lease = owner.current;
    if (!lease) return;
    if (!isLegacyWidgetSessionCurrent(innerProps.session, session)) lease.active = false;
    if (innerProps.isCurrentSource() && lease.active && !lease.admitted) {
      lease.admitted = true;
      setReady(true);
    } else if (lease.admitted && !innerProps.isCurrentSource()) lease.active = false;
  });
  const isCurrentOwner = useCallback(() => {
    const lease = owner.current;
    const valid =
      lease !== null &&
      lease.active &&
      lease.admitted &&
      lease.presentation.isCurrent() &&
      isLegacyWidgetSessionCurrent(host.current.innerProps.session, host.current.session) &&
      host.current.innerProps.isCurrentSource();
    if (!valid && lease?.admitted) lease.active = false;
    return valid;
  }, []);
  const iconResources = useLegacyWidgetIconResources(isCurrentOwner, tempRepository.iconUrl);
  const cancelOwner = owner.current;
  const handleConfirm = useCallback(() => {
    if (!isCurrentOwner()) return;
    setLoading(true);

    const validation = host.current.innerProps.onRepositorySave(host.current.tempRepository);
    setFormErrors(validation.errors);
    if (!validation.hasErrors) {
      if (owner.current) owner.current.active = false;
      actions.closeModal();
    }

    setLoading(false);
  }, [innerProps, tempRepository, actions, isCurrentOwner]);

  const handleCancel = useCallback(() => {
    const lease = cancelOwner;
    if (!lease || owner.current !== lease || !lease.presentation.isCurrent()) return;
    if (isCurrentOwner() && innerProps.onRepositoryCancel) {
      innerProps.onRepositoryCancel();
    }

    lease.active = false;
    actions.closeModal();
  }, [innerProps, actions, isCurrentOwner, cancelOwner]);

  const handleChange = useCallback((changedValue: Partial<ReleasesRepository>) => {
    setTempRepository((prev) => ({ ...prev, ...changedValue }));
  }, []);

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
          onChange={(event) => handleChange({ name: event.currentTarget.value })}
          error={formErrors[`${innerProps.fieldPath}.name`]}
          style={{ flex: 0.3 }}
        />

        <div style={{ flex: 0.7 }}>
          <IconPicker
            {...iconResources}
            withAsterisk={false}
            value={tempRepository.iconUrl ?? ""}
            suggestedSearch={tempRepository.name || tempRepository.identifier}
            onChange={(url) => {
              if (!ready || !isCurrentOwner()) return;
              if (url === "") {
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
          {actionT("cancel")}
        </Button>

        <Button data-autofocus onClick={handleConfirm} loading={loading}>
          {actionT("confirm")}
        </Button>
      </Group>
    </Stack>
  );
}

const RepositoryEditModal = createModal<RepositoryEditProps>(RepositoryEditContent).withOptions({
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
  const tRepository = useI18n("widget.releases.option.repositories");
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
  const tRepository = useI18n("widget.releases.option.repositories");
  const actionT = useI18n("common.action");
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
          {actionT("cancel")}
        </Button>

        <Button onClick={handleConfirm} loading={loading} disabled={selectedImages.length === 0}>
          {actionT("confirm")}
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
