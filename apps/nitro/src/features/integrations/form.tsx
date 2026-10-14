import { useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import {
  Alert,
  Anchor,
  Button,
  ButtonGroup,
  Checkbox,
  Collapse,
  Fieldset,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCheck, IconInfoCircle, IconPencil, IconPlus, IconUnlink } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import type { IntegrationKind } from "@homarr/definitions";
import {
  getAllSecretKindOptions,
  getDefaultSecretKinds,
  getIconUrl,
  getIntegrationApiKeyUrl,
  getIntegrationDefaultUrl,
  getIntegrationName,
  getOptionalSecretKinds,
  integrationDefs,
  integrationSecretKindObject,
} from "@homarr/definitions";
import { getSafeApplicationUrl } from "@homarr/common/url";
import { integrationCreateSchema, integrationUpdateSchema } from "@homarr/validation/integration";
import { zodErrorMap } from "@homarr/validation/form/i18n";
import { useI18n } from "@homarr/translation/standalone/client";

import type { ConnectionError, CreatedIntegration, IntegrationDetail, IntegrationFeatureClient } from "./client";
import { IntegrationAppPicker } from "./app-picker";
import { IntegrationConnectionError } from "./connection-error";
import { IntegrationLoadError } from "./feedback";
import {
  useIntegrationAction,
  useIntegrationFeature,
  useIntegrationQueryKey,
  useInvalidateIntegrations,
} from "./provider";
import { useIntegrationRequestGeneration } from "./request-generation";
import { IntegrationSecretCard, IntegrationSecretInput, SecretKindsControl } from "./secrets";
import type { SecretDraft } from "./secrets";
import {
  IntegrationActionHolds,
  IntegrationApiKeySettingsLink,
  IntegrationFormFields,
} from "../../source-ui/integrations";

export interface IntegrationEditFormHandle {
  submit: () => Promise<boolean>;
  isDirty: () => boolean;
}

export type IntegrationFormProps =
  | {
      mode: "create";
      kind: IntegrationKind;
      initialUrl?: string;
      initialName?: string;
      onCreated: (result: CreatedIntegration) => void | Promise<void>;
      onCancel?: () => void;
    }
  | {
      mode: "edit";
      integration: IntegrationDetail;
      onSaved?: () => void | Promise<void>;
      onCancel?: () => void;
      formRef?: Ref<IntegrationEditFormHandle>;
      hideButtons?: boolean;
    };

export function IntegrationForm(props: IntegrationFormProps) {
  return (
    <IntegrationFormContent
      key={
        props.mode === "edit" ? props.integration.id : JSON.stringify([props.kind, props.initialUrl, props.initialName])
      }
      {...props}
    />
  );
}

function getStoredSecretKinds(integration: IntegrationDetail) {
  const options = getAllSecretKindOptions(integration.kind);
  const optionalKinds = getOptionalSecretKinds(integration.kind);
  const requiredStored = integration.secrets.filter((secret) => !optionalKinds.includes(secret.kind));
  const matchingOptions = options.filter((option) => requiredStored.every((secret) => option.includes(secret.kind)));
  return (
    matchingOptions.find((option) => option.length === requiredStored.length) ??
    matchingOptions[0] ??
    getDefaultSecretKinds(integration.kind)
  );
}

function getStoredSecretValue(secret: IntegrationDetail["secrets"][number] | undefined) {
  if (!secret || !integrationSecretKindObject[secret.kind].isPublic) return "";
  return secret.value ?? "";
}

function IntegrationFormContent(props: IntegrationFormProps) {
  const t = useI18n();
  const { client, principal, readOnly, notify, writeBlocked, isWriteBlocked, beginWrite, captureWriteCurrent } =
    useIntegrationFeature();
  const saveAvailability = useIntegrationAction(props.mode === "create" ? "create" : "update");
  const testAvailability = useIntegrationAction("test");
  const saveHeld = saveAvailability.state === "held";
  const testHeld = testAvailability.state === "held";
  const key = useIntegrationQueryKey();
  const invalidate = useInvalidateIntegrations("integration", true);
  const requests = useIntegrationRequestGeneration();
  const intent = useRef(0);
  const completedIntent = useRef<number | null>(null);
  const rendered = {};
  const latestRender = useRef(rendered);
  latestRender.current = rendered;
  const changeIntent = () => {
    intent.current += 1;
    requests.invalidate();
  };
  const incomingIntegration = props.mode === "edit" ? props.integration : undefined;
  const [integration, setIntegration] = useState(incomingIntegration);
  const kind = props.mode === "edit" ? props.integration.kind : props.kind;
  const options = getAllSecretKindOptions(kind);
  const optionalKinds = getOptionalSecretKinds(kind);
  const initialKinds = integration ? getStoredSecretKinds(integration) : options[0];
  const hasUrlSecret =
    props.mode === "create" ? options.some((option) => option.includes("url")) : initialKinds.includes("url");
  const canCreateApps = principal.kind === "authenticated" && principal.user.permissions.includes("app-create");
  const canCreateIntegration =
    principal.kind === "authenticated" && principal.user.permissions.includes("integration-create");
  const initialUrl =
    integration?.url ??
    (hasUrlSecret
      ? "http://localhost"
      : props.mode === "create"
        ? (props.initialUrl ?? getIntegrationDefaultUrl(kind) ?? "")
        : "");
  const [name, setName] = useState(
    integration?.name ?? (props.mode === "create" ? props.initialName : undefined) ?? getIntegrationName(kind),
  );
  const [url, setUrl] = useState(initialUrl);
  const [secrets, setSecrets] = useState<SecretDraft[]>(() =>
    initialKinds.map((secretKind) => ({
      kind: secretKind,
      value: getStoredSecretValue(integration?.secrets.find((secret) => secret.kind === secretKind)),
    })),
  );
  const [optionalSecrets, setOptionalSecrets] = useState<SecretDraft[]>(() =>
    optionalKinds.map((secretKind) => ({
      kind: secretKind,
      value: getStoredSecretValue(integration?.secrets.find((secret) => secret.kind === secretKind)),
    })),
  );
  const [attemptSearchEngineCreation, setAttemptSearchEngineCreation] = useState(true);
  const [hasApp, setHasApp] = useState(canCreateApps);
  const [appMode, setAppMode] = useState<"new" | "existing">(canCreateApps ? "new" : "existing");
  const [appHref, setAppHref] = useState(initialUrl);
  const [appId, setAppId] = useState<string | null>(null);
  const [linkedApp, setLinkedApp] = useState<IntegrationDetail["app"]>(integration?.app ?? null);
  const [appPickerOpened, setAppPickerOpened] = useState(false);
  const [failure, setFailure] = useState<{ error: ConnectionError; url: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const apps = useQuery({
    queryKey: [...key, "apps", "selectable"],
    queryFn: ({ signal }) => client.app.selectable(undefined, { signal }),
    enabled: props.mode === "create" && hasApp && appMode === "existing" && principal.kind === "authenticated",
    retry: false,
  });
  const test = useMutation({
    mutationFn: ({ id }: { id: string; generation: number }) => client.integration.testConnection({ id }),
    retry: false,
    onSuccess: (result, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      let notification: "success" | "secretNotDefined" | "invalidCredentials" | "commonError" = "success";
      if (!result.success) {
        notification = "commonError";
        if (result.error === "missingSecret") notification = "secretNotDefined";
        if (result.error === "authorization") notification = "invalidCredentials";
      }
      notify({
        color: result.success ? "green" : "red",
        title: t(`integration.testConnection.notification.${notification}.title`),
        message: t(`integration.testConnection.notification.${notification}.message`),
      });
    },
    onError: (_, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      notify({
        color: "red",
        title: t("integration.testConnection.notification.commonError.title"),
        message: t("integration.testConnection.notification.commonError.message"),
      });
    },
  });

  const disabled = pending || readOnly || test.isPending || writeBlocked;
  const isDirty = () =>
    name !== integration?.name ||
    url !== integration?.url ||
    linkedApp?.id !== integration?.app?.id ||
    secrets.length !== initialKinds.length ||
    secrets.some(
      (secret, index) =>
        secret.kind !== initialKinds[index] ||
        secret.value !== getStoredSecretValue(integration?.secrets.find((stored) => stored.kind === secret.kind)),
    ) ||
    optionalSecrets.some(
      (secret) =>
        secret.value !== getStoredSecretValue(integration?.secrets.find((stored) => stored.kind === secret.kind)),
    );

  const submit = async () => {
    if (
      !requests.isActive() ||
      !captureWriteCurrent(requests.isActive)() ||
      latestRender.current !== rendered ||
      disabled ||
      isWriteBlocked() ||
      saveHeld ||
      principal.kind !== "authenticated" ||
      (props.mode === "create" && !canCreateIntegration)
    )
      return false;
    if (completedIntent.current === intent.current) return props.mode === "edit";
    const generation = requests.begin();
    const submittedIntent = intent.current;
    const isCurrent = captureWriteCurrent(requests.isCurrent.bind(undefined, generation));
    setFailure(null);
    setErrors({});
    let resolvedUrl = url;
    if (hasUrlSecret) {
      try {
        resolvedUrl = new URL(secrets.find((secret) => secret.kind === "url")?.value || url).origin;
      } catch {
        setErrors({ "secrets.0.value": t("integration.testConnection.notification.invalidUrl.message") });
        return false;
      }
    }
    const optional = optionalSecrets.flatMap((secret) =>
      secret.value.trim() ? [{ kind: secret.kind, value: secret.value.trim() }] : [],
    );
    const fail = () =>
      notify({
        color: "red",
        title: t(`common.notification.${props.mode === "create" ? "create" : "update"}.error`),
        message: t(`integration.page.${props.mode}.notification.error.message`),
      });
    const showConnectionError = (connectionError: ConnectionError, testedUrl: string) => {
      if (!isCurrent()) return;
      setFailure({ error: connectionError, url: testedUrl });
      fail();
      requestAnimationFrame(() => {
        if (isCurrent()) errorRef.current?.focus();
      });
    };
    const reconcile = async (
      attempt: NonNullable<ReturnType<typeof beginWrite>>,
      mode: "create" | "edit",
      deliver: () => void | Promise<void>,
    ) => {
      completedIntent.current = submittedIntent;
      await attempt.refresh();
      if (isCurrent()) {
        try {
          notify({
            color: "green",
            title: t(`common.notification.${mode === "create" ? "create" : "update"}.success`),
            message: t(`integration.page.${mode}.notification.success.message`),
          });
          attempt.notification("complete");
        } catch {
          attempt.notification("failed");
        }
      } else attempt.notification("retired");
      if (attempt.enterDelivery()) {
        try {
          await deliver();
          attempt.finishDelivery("complete");
        } catch {
          attempt.finishDelivery("failed");
        }
      }
      const settled = attempt.complete();
      return settled && isCurrent();
    };
    if (props.mode === "create") {
      if (hasApp && appMode === "existing" && !appId) {
        setErrors({ appId: t("common.zod.errors.required") });
        return false;
      }
      const payload = {
        kind,
        name,
        url: resolvedUrl,
        secrets: [...secrets, ...optional],
        attemptSearchEngineCreation,
        app: !hasApp
          ? undefined
          : appMode === "existing" && appId
            ? { id: appId }
            : canCreateApps
              ? {
                  name,
                  href: appHref.trim() || resolvedUrl,
                  iconUrl: getIconUrl(kind),
                  description: null,
                  pingUrl: resolvedUrl,
                }
              : undefined,
      };
      const validation = integrationCreateSchema.safeParse(payload, { error: zodErrorMap(t) });
      if (!validation.success) {
        setErrors(Object.fromEntries(validation.error.issues.map((issue) => [issue.path.join("."), issue.message])));
        return false;
      }
      const onCreated = props.onCreated;
      const input = validation.data;
      const attempt = beginWrite({ target: { mode: "create", kind }, generation, isCurrent, refresh: invalidate });
      if (!attempt) return false;
      let result: Awaited<ReturnType<IntegrationFeatureClient["integration"]["create"]>>;
      try {
        const response = client.integration.create(input);
        if (isCurrent()) setPending(true);
        result = await response;
      } catch {
        attempt.unconfirmed();
        if (isCurrent()) setPending(false);
        return false;
      }
      if (!("integration" in result) || result.integration === undefined) {
        if ("error" in result && result.error !== undefined) {
          attempt.reject();
          if (isCurrent()) setPending(false);
          showConnectionError(result.error, input.url);
        } else {
          attempt.unconfirmed();
          if (isCurrent()) setPending(false);
        }
        return false;
      }
      attempt.acknowledge({ mode: "create", result });
      if (isCurrent()) setPending(false);
      const acknowledged = result;
      return reconcile(attempt, "create", () => onCreated(acknowledged));
    } else {
      const validation = integrationUpdateSchema.safeParse(
        {
          id: props.integration.id,
          name,
          url: resolvedUrl,
          secrets: [
            ...secrets.map((secret) => ({ kind: secret.kind, value: secret.value === "" ? null : secret.value })),
            ...optional,
          ],
          appId: linkedApp?.id ?? null,
        },
        { error: zodErrorMap(t) },
      );
      if (!validation.success) {
        setErrors(Object.fromEntries(validation.error.issues.map((issue) => [issue.path.join("."), issue.message])));
        return false;
      }
      const onSaved = props.onSaved;
      const input = validation.data;
      const attempt = beginWrite({
        target: { mode: "edit", id: input.id },
        generation,
        isCurrent,
        refresh: invalidate,
      });
      if (!attempt) return false;
      let result: Awaited<ReturnType<IntegrationFeatureClient["integration"]["update"]>>;
      try {
        const response = client.integration.update(input);
        if (isCurrent()) setPending(true);
        result = await response;
      } catch {
        attempt.unconfirmed();
        if (isCurrent()) setPending(false);
        return false;
      }
      if (result?.error) {
        attempt.reject();
        if (isCurrent()) setPending(false);
        showConnectionError(result.error, input.url);
        return false;
      }
      attempt.acknowledge({ mode: "edit", result });
      if (isCurrent()) setPending(false);
      return reconcile(attempt, "edit", () => onSaved?.());
    }
  };

  useImperativeHandle(props.mode === "edit" ? props.formRef : undefined, () => ({ submit, isDirty }));

  if (incomingIntegration && incomingIntegration !== integration && !isDirty()) {
    const nextKinds = getStoredSecretKinds(incomingIntegration);
    setIntegration(incomingIntegration);
    setName(incomingIntegration.name);
    setUrl(incomingIntegration.url);
    setSecrets(
      nextKinds.map((secretKind) => ({
        kind: secretKind,
        value: getStoredSecretValue(incomingIntegration.secrets.find((secret) => secret.kind === secretKind)),
      })),
    );
    setOptionalSecrets(
      getOptionalSecretKinds(incomingIntegration.kind).map((secretKind) => ({
        kind: secretKind,
        value: getStoredSecretValue(incomingIntegration.secrets.find((secret) => secret.kind === secretKind)),
      })),
    );
    setLinkedApp(incomingIntegration.app);
    setFailure(null);
    setErrors({});
  }

  const isInitialOption =
    initialKinds.length === secrets.length &&
    initialKinds.every((secretKind) => secrets.some((secret) => secret.kind === secretKind));
  const categories: readonly string[] = integrationDefs[kind].category;
  const supportsSearch = categories.includes("search") && !categories.includes("mediaSearch");
  let apiKeyUrl: string | null = null;
  try {
    const normalizedUrl = new URL(url).href;
    apiKeyUrl = getSafeApplicationUrl(getIntegrationApiKeyUrl(normalizedUrl, kind) ?? "") ?? null;
  } catch {
    try {
      const normalizedUrl = new URL(`http://${url}`).href;
      apiKeyUrl = getSafeApplicationUrl(getIntegrationApiKeyUrl(normalizedUrl, kind) ?? "") ?? null;
    } catch {
      apiKeyUrl = null;
    }
  }
  const linkedHref = linkedApp?.href ? getSafeApplicationUrl(linkedApp.href) : null;

  const content = (
    <IntegrationFormFields
      mode={props.mode}
      validation={
        Object.keys(errors).length > 0 && (
          <Alert color="red" title={t("common.error")} role="alert">
            {Object.values(errors).join(" ")}
          </Alert>
        )
      }
      name={{
        label: t("common.field.name"),
        autoFocus: props.mode === "create",
        value: name,
        error: errors.name,
        disabled,
        onChange: (event) => {
          changeIntent();
          setName(event.currentTarget.value);
        },
      }}
      url={
        hasUrlSecret
          ? undefined
          : {
              value: url,
              error: errors.url,
              disabled,
              onChange: (event) => {
                changeIntent();
                setUrl(event.currentTarget.value);
              },
            }
      }
      secretsTitle={t("integration.secrets.title")}
      secrets={
        <>
          {options.length > 1 && (
            <SecretKindsControl
              options={options}
              secrets={secrets}
              disabled={disabled}
              onChange={(value) => {
                changeIntent();
                setSecrets(value);
              }}
            />
          )}
          {secrets.map((secret, index) => {
            const stored = integration?.secrets.find((entry) => entry.kind === secret.kind);
            const input = (
              <IntegrationSecretInput
                kind={secret.kind}
                value={secret.value}
                disabled={disabled}
                required={props.mode === "create" || !isInitialOption}
                label={
                  props.mode === "edit" && isInitialOption
                    ? t(`integration.secrets.kind.${secret.kind}.newLabel`)
                    : undefined
                }
                error={errors[`secrets.${index}.value`]}
                onChange={(value) => {
                  changeIntent();
                  setSecrets((current) =>
                    current.map((entry, position) => (position === index ? { ...entry, value } : entry)),
                  );
                }}
              />
            );
            return props.mode === "edit" && isInitialOption ? (
              <IntegrationSecretCard
                key={secret.kind}
                kind={secret.kind}
                secret={stored}
                disabled={disabled}
                changed={secret.value !== getStoredSecretValue(stored)}
                reset={() => {
                  changeIntent();
                  setSecrets((current) =>
                    current.map((entry, position) =>
                      position === index ? { ...entry, value: getStoredSecretValue(stored) } : entry,
                    ),
                  );
                }}
              >
                {input}
              </IntegrationSecretCard>
            ) : (
              <div key={secret.kind}>{input}</div>
            );
          })}
          {secrets.length === 0 && (
            <Alert icon={<IconInfoCircle size="1rem" />} color="blue">
              <Text c="blue">{t("integration.secrets.noSecretsRequired.text")}</Text>
            </Alert>
          )}
          {optionalSecrets.map((secret, index) => (
            <IntegrationSecretInput
              key={secret.kind}
              kind={secret.kind}
              value={secret.value}
              disabled={disabled}
              onChange={(value) => {
                changeIntent();
                setOptionalSecrets((current) =>
                  current.map((entry, position) => (position === index ? { ...entry, value } : entry)),
                );
              }}
            />
          ))}
          {props.mode === "create" && (
            <IntegrationApiKeySettingsLink safeHref={apiKeyUrl} label={t("integration.field.apiKeySettings.label")} />
          )}
        </>
      }
      searchEngine={
        props.mode === "create" && supportsSearch
          ? {
              label: t("integration.field.attemptSearchEngineCreation.label"),
              description: t("integration.field.attemptSearchEngineCreation.description", {
                kind: getIntegrationName(kind),
              }),
              checked: attemptSearchEngineCreation,
              disabled,
              onChange: (event) => {
                changeIntent();
                setAttemptSearchEngineCreation(event.currentTarget.checked);
              },
            }
          : undefined
      }
      app={
        props.mode === "create" ? (
          <>
            <Checkbox
              label={t(canCreateApps ? "integration.field.createApp.label" : "integration.field.linkApp.label")}
              description={t(
                canCreateApps ? "integration.field.createApp.description" : "integration.field.linkApp.description",
              )}
              checked={hasApp}
              disabled={disabled}
              onChange={(event) => {
                changeIntent();
                setHasApp(event.currentTarget.checked);
                setAppHref(url);
              }}
            />
            <Collapse expanded={hasApp}>
              <Fieldset legend={t("integration.field.app.sectionTitle")}>
                <Stack gap="sm">
                  {canCreateApps && (
                    <SegmentedControl
                      value={appMode}
                      disabled={disabled}
                      data={(["new", "existing"] as const).map((value) => ({
                        value,
                        label: t(`integration.page.create.app.option.${value}.title`),
                      }))}
                      onChange={(value) => {
                        changeIntent();
                        setAppMode(value === "new" ? "new" : "existing");
                        setAppId(null);
                        setAppHref(url);
                      }}
                    />
                  )}
                  {appMode === "new" && canCreateApps ? (
                    <TextInput
                      label={t("integration.page.create.app.option.new.url.label")}
                      description={t("integration.page.create.app.option.new.url.description")}
                      placeholder={t("integration.field.appHref.placeholder")}
                      withAsterisk
                      value={appHref}
                      error={errors["app.href"]}
                      disabled={disabled}
                      onChange={(event) => {
                        changeIntent();
                        setAppHref(event.currentTarget.value);
                      }}
                    />
                  ) : (
                    <>
                      <Select
                        searchable
                        clearable
                        label={t("integration.page.create.app.option.existing.label")}
                        withAsterisk
                        value={appId}
                        error={errors.appId}
                        disabled={disabled || apps.isPending || apps.isError}
                        leftSection={
                          appId ? (
                            <img
                              width={20}
                              height={20}
                              src={apps.data?.find((app) => app.id === appId)?.iconUrl}
                              alt={apps.data?.find((app) => app.id === appId)?.name}
                            />
                          ) : null
                        }
                        data={apps.data?.map((app) => ({ value: app.id, label: app.name }))}
                        nothingFoundMessage={t("app.action.select.noResults")}
                        onChange={(value) => {
                          changeIntent();
                          setAppId(value);
                        }}
                        renderOption={({ option, checked }) => {
                          const app = apps.data?.find((entry) => entry.id === option.value);
                          return (
                            <Group flex="1" gap="xs">
                              <img width={20} height={20} src={app?.iconUrl} alt={option.label} />
                              <Stack gap={0}>
                                <Text>{option.label}</Text>
                                <Text size="xs" c="dimmed">
                                  {app?.href}
                                </Text>
                              </Stack>
                              {checked && (
                                <IconCheck
                                  style={{ marginInlineStart: "auto" }}
                                  stroke={1.5}
                                  color="currentColor"
                                  opacity={0.6}
                                  size={18}
                                />
                              )}
                            </Group>
                          );
                        }}
                      />
                      {apps.isError && <IntegrationLoadError retry={() => void apps.refetch()} />}
                    </>
                  )}
                </Stack>
              </Fieldset>
            </Collapse>
          </>
        ) : (
          <>
            {linkedApp ? (
              <Fieldset legend={t("integration.field.app.sectionTitle")}>
                <Group justify="space-between">
                  <Group gap="sm">
                    <img src={linkedApp.iconUrl} alt={linkedApp.name} width={32} height={32} />
                    <Stack gap={0}>
                      <Text size="sm" fw={700}>
                        {linkedApp.name}
                      </Text>
                      {linkedHref && (
                        <Anchor href={linkedHref} target="_blank" rel="noopener noreferrer" size="sm">
                          {linkedApp.href}
                        </Anchor>
                      )}
                    </Stack>
                  </Group>
                  <ButtonGroup>
                    <Button
                      variant="subtle"
                      color="gray"
                      leftSection={<IconUnlink size={16} stroke={1.5} />}
                      disabled={disabled}
                      onClick={() => {
                        changeIntent();
                        setLinkedApp(null);
                      }}
                    >
                      {t("integration.page.edit.app.action.remove")}
                    </Button>
                    <Button
                      variant="subtle"
                      color="gray"
                      leftSection={<IconPencil size={16} stroke={1.5} />}
                      disabled={disabled}
                      onClick={() => setAppPickerOpened(true)}
                    >
                      {t("common.action.change")}
                    </Button>
                  </ButtonGroup>
                </Group>
              </Fieldset>
            ) : (
              <Button
                variant="subtle"
                color="gray"
                fullWidth
                leftSection={<IconPlus size={16} stroke={1.5} />}
                disabled={disabled}
                onClick={() => setAppPickerOpened(true)}
              >
                {t("integration.page.edit.app.action.add")}
              </Button>
            )}
            <IntegrationAppPicker
              opened={appPickerOpened}
              onClose={() => setAppPickerOpened(false)}
              onSelect={(value) => {
                changeIntent();
                setLinkedApp(value);
              }}
            />
          </>
        )
      }
      error={
        failure && (
          <div ref={errorRef} role="alert" tabIndex={-1}>
            <IntegrationConnectionError error={failure.error} url={failure.url} />
          </div>
        )
      }
      holds={
        <IntegrationActionHolds
          availability={props.mode === "edit" ? [saveAvailability, testAvailability] : [saveAvailability]}
        />
      }
      actions={
        !(props.mode === "edit" && props.hideButtons) && (
          <Group justify="end">
            {props.onCancel ? (
              <Button
                variant="default"
                disabled={pending}
                onClick={() => {
                  requests.invalidate();
                  props.onCancel?.();
                }}
              >
                {t("common.action.backToOverview")}
              </Button>
            ) : (
              <Button variant="default" component="a" href="/manage/integrations">
                {t("common.action.backToOverview")}
              </Button>
            )}
            {props.mode === "edit" && (
              <Button
                variant="default"
                disabled={disabled || testHeld || isDirty()}
                loading={test.isPending}
                onClick={() => {
                  if (integration && !disabled && !testHeld && !isDirty())
                    test.mutate({ id: integration.id, generation: requests.begin() });
                }}
              >
                {t("init.studio.connect.testConnection")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                disabled ||
                saveHeld ||
                completedIntent.current === intent.current ||
                (props.mode === "create" && !canCreateIntegration)
              }
              loading={pending}
            >
              {t(`integration.testConnection.action.${props.mode}`)}
            </Button>
          </Group>
        )
      }
    />
  );
  if (props.mode === "edit" && props.hideButtons) return content;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {content}
    </form>
  );
}
