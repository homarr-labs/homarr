import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Fieldset, Group, Modal, Select, Stack, Switch, Text, TextInput } from "@mantine/core";

import type { ReleasesRepository } from "../../../../../packages/widgets/src/releases/releases-repository";
import type { EditorTranslate, SpecializedOptionProps, WidgetEditorDomain, WidgetEditorBindings } from "./contracts";
import { WidgetSecrets } from "./widget-secrets";

export function ReleaseRepositories(
  props: SpecializedOptionProps & { domain: WidgetEditorDomain; t: EditorTranslate; bindings: WidgetEditorBindings },
) {
  const { domain, t } = props;
  const [editing, setEditing] = useState<{
    index: number;
    value: ReleasesRepository;
    pristineValue: ReleasesRepository;
    isNew: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notifyDirty = props.onDirtyChange;
  const repositoryDraftPath = `${props.property}.repositoryDraft`;
  const repositoryDraftDirty =
    editing !== null && JSON.stringify(editing.value) !== JSON.stringify(editing.pristineValue);
  useEffect(() => {
    notifyDirty(repositoryDraftPath, repositoryDraftDirty);
  }, [notifyDirty, repositoryDraftDirty, repositoryDraftPath]);
  useEffect(() => () => notifyDirty(repositoryDraftPath, false), [notifyDirty, repositoryDraftPath]);
  const onTokenDirtyChange = useCallback(
    (kind: string, dirty: boolean) => {
      notifyDirty(`${props.property}.secret.${kind}`, dirty);
    },
    [notifyDirty, props.property],
  );
  const raw = props.value.options[props.property];
  const parsed = props.option.type === "multiReleasesRepositories" ? props.option.validate?.safeParse(raw) : undefined;
  const repositories = parsed?.success ? (parsed.data as ReleasesRepository[]) : [];
  const setRepository = (patch: Partial<ReleasesRepository>) =>
    setEditing((current) => (current ? { ...current, value: { ...current.value, ...patch } } : null));
  const save = () => {
    if (!editing || props.disabled || props.option.type !== "multiReleasesRepositories") return;
    const next = editing.isNew
      ? [...repositories, editing.value]
      : repositories.map((repository, index) => (index === editing.index ? editing.value : repository));
    const validation = props.option.validate?.safeParse(next);
    if (validation && !validation.success) {
      setError(validation.error.issues.map((issue) => issue.message).join("\n"));
      return;
    }
    props.onChange(next);
    setEditing(null);
    setError(null);
  };
  const namespace = "widget.releases.option.repositories";
  return (
    <>
      <Fieldset legend={t(`${namespace}.label`)}>
        <Stack gap="sm">
          {props.error && <Alert color="red">{props.error}</Alert>}
          {parsed && !parsed.success && <Alert color="yellow">{t("nitro.widgetEditor.invalidRepositories")}</Alert>}
          <Button
            variant="light"
            disabled={props.disabled || (parsed !== undefined && !parsed.success)}
            onClick={() => {
              setError(null);
              const value = { id: domain.createId(), identifier: "" };
              setEditing({ index: repositories.length, value, pristineValue: value, isNew: true });
            }}
          >
            {t(`${namespace}.addRepository.label`)}
          </Button>
          {repositories.map((repository, index) => (
            <Group key={repository.id} justify="space-between" wrap="nowrap">
              <Stack gap={0}>
                <Text size="sm">{repository.name || repository.identifier}</Text>
                <Text size="xs" c="dimmed">
                  {repository.provider ? domain.getReleaseProviderName(repository.provider) : ""}
                </Text>
              </Stack>
              <Group gap="xs">
                <Button
                  variant="subtle"
                  disabled={props.disabled}
                  onClick={() => {
                    setError(null);
                    setEditing({
                      index,
                      value: structuredClone(repository),
                      pristineValue: structuredClone(repository),
                      isNew: false,
                    });
                  }}
                >
                  {t("common.action.edit")}
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  disabled={props.disabled}
                  onClick={() => props.onChange(repositories.filter((_, entry) => entry !== index))}
                >
                  {t("common.action.remove")}
                </Button>
              </Group>
            </Group>
          ))}
          <WidgetSecrets
            itemId={props.itemId}
            canModifyBoard={!props.disabled}
            writesAvailable={props.bindings.secretWritesAvailable}
            client={props.client}
            queryUtils={props.queryUtils}
            domain={domain}
            t={t}
            onDirtyChange={onTokenDirtyChange}
          />
        </Stack>
      </Fieldset>
      <Modal
        opened={editing !== null}
        onClose={() => {
          setEditing(null);
          setError(null);
        }}
        title={t(`${namespace}.addRepository.label`)}
        closeOnClickOutside={false}
      >
        {editing && (
          <Stack gap="sm">
            {error && (
              <Alert color="red" role="alert" style={{ whiteSpace: "pre-wrap" }}>
                {error}
              </Alert>
            )}
            <Select
              label={t(`${namespace}.provider.label`)}
              data={domain.releaseProviderKinds.map((kind) => ({
                value: kind,
                label: domain.getReleaseProviderName(kind),
              }))}
              value={editing.value.provider ?? null}
              onChange={(value) => {
                const provider = domain.releaseProviderKinds.find((kind) => kind === value);
                setRepository({ provider });
              }}
            />
            <TextInput
              label={t(`${namespace}.identifier.label`)}
              value={editing.value.identifier}
              onChange={(event) => setRepository({ identifier: event.currentTarget.value })}
              withAsterisk
            />
            <TextInput
              label={t(`${namespace}.name.label`)}
              value={editing.value.name ?? ""}
              onChange={(event) => setRepository({ name: event.currentTarget.value || undefined })}
            />
            <TextInput
              label={t(`${namespace}.providerUrl.label`)}
              placeholder={
                editing.value.provider ? domain.getReleaseProviderDefaultUrl(editing.value.provider) : undefined
              }
              value={editing.value.providerUrl ?? ""}
              onChange={(event) => setRepository({ providerUrl: event.currentTarget.value || undefined })}
            />
            <TextInput
              label={t(`${namespace}.iconUrl.label`)}
              value={editing.value.iconUrl ?? ""}
              onChange={(event) => setRepository({ iconUrl: event.currentTarget.value || undefined })}
            />
            <Switch
              label={t(`${namespace}.versionFilter.label`)}
              checked={editing.value.versionFilter !== undefined}
              onChange={(event) =>
                setRepository({ versionFilter: event.currentTarget.checked ? { precision: 3 } : undefined })
              }
            />
            {editing.value.versionFilter && (
              <Group grow>
                <TextInput
                  label={t(`${namespace}.versionFilter.prefix.label`)}
                  value={editing.value.versionFilter.prefix ?? ""}
                  onChange={(event) =>
                    setRepository({
                      versionFilter: {
                        ...editing.value.versionFilter,
                        precision: editing.value.versionFilter?.precision ?? 3,
                        prefix: event.currentTarget.value || undefined,
                      },
                    })
                  }
                />
                <Select
                  label={t(`${namespace}.versionFilter.precision.label`)}
                  data={[0, 1, 2, 3, 4, 5].map((value) => ({
                    value: String(value),
                    label:
                      value === 0
                        ? t(`${namespace}.versionFilter.precision.options.none`)
                        : Array.from({ length: value }, () => "#").join("."),
                  }))}
                  value={String(editing.value.versionFilter.precision)}
                  onChange={(value) => {
                    if (value !== null)
                      setRepository({ versionFilter: { ...editing.value.versionFilter, precision: Number(value) } });
                  }}
                />
                <TextInput
                  label={t(`${namespace}.versionFilter.suffix.label`)}
                  value={editing.value.versionFilter.suffix ?? ""}
                  onChange={(event) =>
                    setRepository({
                      versionFilter: {
                        ...editing.value.versionFilter,
                        precision: editing.value.versionFilter?.precision ?? 3,
                        suffix: event.currentTarget.value || undefined,
                      },
                    })
                  }
                />
              </Group>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditing(null)}>
                {t("common.action.cancel")}
              </Button>
              <Button disabled={props.disabled} onClick={save}>
                {t("common.action.save")}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
