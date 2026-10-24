"use client";

import { Button, Fieldset, Group, PasswordInput, Select, Stack, TextInput } from "@mantine/core";
import { IconKey, IconTrash, IconPlus } from "@tabler/icons-react";

import {
  getCustomWidgetSourceUrlIssue,
  getCustomWidgetHeaderSecretKind,
  MAX_CUSTOM_WIDGET_AUTH_HEADERS,
} from "@homarr/custom-widgets/core";
import type {
  CustomWidgetHttpSource,
  CustomWidgetSource,
  CustomWidgetSourceUrlIssue,
  CustomWidgetSecretKind,
  CustomWidgetLegacySecretKind,
  CustomWidgetAuthenticationHeader,
} from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

import { IntegrationSourceSelect } from "~/components/custom-widgets/integration-source-select";

import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { CustomWidgetIdentifierInput } from "./_custom-widget-identifier-input";
import classes from "./_custom-widget-form.module.css";

type SecretKind = CustomWidgetSecretKind;

const secretFields: Record<string, Array<{ kind: CustomWidgetLegacySecretKind }>> = {
  bearer: [{ kind: "apiKey" }],
  basic: [{ kind: "username" }, { kind: "password" }],
  apiKeyHeader: [{ kind: "apiKey" }],
  apiKeyQuery: [{ kind: "apiKey" }],
};

const sourceUrlErrorKeys: Record<CustomWidgetSourceUrlIssue, `baseUrlError.${CustomWidgetSourceUrlIssue}`> = {
  invalid: "baseUrlError.invalid",
  protocol: "baseUrlError.protocol",
  credentials: "baseUrlError.credentials",
  queryOrFragment: "baseUrlError.queryOrFragment",
};

interface CustomWidgetSourceFieldProps {
  source: CustomWidgetSource & { id: string };
  index: number;
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
  clearSecretPending: boolean;
  onUpdate(index: number, changes: Partial<CustomWidgetSource> & { id?: string }): void;
  onSetAuthentication(index: number, type: string): void;
  onSetSecret(sourceId: string, kind: string, value: string): void;
  onClearSecret(sourceId: string, kind: SecretKind): Promise<void>;
  onRemove(index: number): void;
  compact?: boolean;
}

export function CustomWidgetSourceField({
  source,
  index,
  form,
  definitionId,
  clearSecretPending,
  onUpdate,
  onSetAuthentication,
  onSetSecret,
  onClearSecret,
  onRemove,
  compact = false,
}: CustomWidgetSourceFieldProps) {
  const t = useI18n("customWidget.workbench.sources");
  let legend = source.name;
  if (index === 0) legend = t("primary");
  if (compact) legend = undefined;

  return (
    <Fieldset legend={legend} p={compact ? 0 : undefined} style={compact ? { border: 0 } : undefined}>
      <Stack gap="sm" className={compact && source.type !== "integration" ? classes.compactSource : undefined}>
        <Group grow align="start" display={compact ? "none" : undefined}>
          <CustomWidgetIdentifierInput
            label={t("id")}
            value={source.id}
            disabled={source.id === "default" || Boolean(definitionId)}
            error={form.errors.sources}
            onCommit={(value) => onUpdate(index, { id: value })}
          />
          <TextInput
            label={t("name")}
            value={source.name}
            onChange={(event) => onUpdate(index, { name: event.currentTarget.value })}
          />
        </Group>
        <Select
          className={classes.sourceType}
          label={t("sourceType")}
          data={[
            { value: "http", label: t("manualSource") },
            { value: "integration", label: t("existingIntegration") },
          ]}
          value={source.type ?? "http"}
          allowDeselect={false}
          onChange={(type) => {
            if (type === "integration") onUpdate(index, { type, integrationKind: "sonarr" });
            else if (type === "http") onUpdate(index, { type, baseUrl: "https://example.com", auth: "none" });
          }}
        />
        {source.type === "integration" && (
          <IntegrationSourceSelect
            kind={source.integrationKind}
            integrationId={source.integrationId}
            onChange={(integrationId) => onUpdate(index, { integrationId })}
            onKindChange={(integrationKind) => onUpdate(index, { integrationKind, integrationId: undefined })}
          />
        )}
        {source.type !== "integration" && (
          <CustomWidgetHttpSourceFields
            source={source}
            compact={compact}
            index={index}
            form={form}
            definitionId={definitionId}
            clearSecretPending={clearSecretPending}
            onUpdate={onUpdate}
            onSetAuthentication={onSetAuthentication}
            onSetSecret={onSetSecret}
            onClearSecret={onClearSecret}
          />
        )}
        {index > 0 && (
          <Button
            type="button"
            color="red"
            variant="subtle"
            leftSection={<IconTrash size={16} />}
            onClick={() => onRemove(index)}
          >
            {t("remove")}
          </Button>
        )}
      </Stack>
    </Fieldset>
  );
}

function CustomWidgetHttpSourceFields({
  source,
  index,
  form,
  definitionId,
  clearSecretPending,
  onUpdate,
  onSetAuthentication,
  onSetSecret,
  onClearSecret,
  compact = false,
}: Omit<CustomWidgetSourceFieldProps, "source" | "onRemove"> & { source: CustomWidgetHttpSource & { id: string } }) {
  const t = useI18n("customWidget.workbench.sources");
  const tSecret = useI18n("customWidget.secret");
  const baseUrlIssue = getCustomWidgetSourceUrlIssue(source.baseUrl);
  const authType = typeof source.auth === "string" ? source.auth : source.auth.type;
  let authHeaders: CustomWidgetAuthenticationHeader[] = [];
  if (typeof source.auth === "object" && source.auth.type === "headers" && Array.isArray(source.auth.headers)) {
    authHeaders = source.auth.headers.filter(
      (header) => typeof header?.name === "string" && typeof header.slot === "string",
    );
  }
  return (
    <>
      <TextInput
        className={compact ? classes.sourceUrl : undefined}
        label={t("baseUrl")}
        type="url"
        value={source.baseUrl}
        error={baseUrlIssue ? t(sourceUrlErrorKeys[baseUrlIssue]) : undefined}
        onChange={(event) => onUpdate(index, { baseUrl: event.currentTarget.value })}
      />
      <Group grow align="start">
        <Select
          label={t("authentication")}
          data={["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery", "headers"]}
          value={authType}
          onChange={(value) => onSetAuthentication(index, value ?? "none")}
          allowDeselect={false}
        />
      </Group>
      {typeof source.auth === "object" && source.auth.type === "apiKeyHeader" && (
        <TextInput
          label={t("headerName")}
          value={source.auth.name}
          onChange={(event) => onUpdate(index, { auth: { type: "apiKeyHeader", name: event.currentTarget.value } })}
        />
      )}
      {typeof source.auth === "object" && source.auth.type === "apiKeyQuery" && (
        <TextInput
          label={t("queryParameter")}
          value={source.auth.name}
          onChange={(event) => onUpdate(index, { auth: { type: "apiKeyQuery", name: event.currentTarget.value } })}
        />
      )}
      {typeof source.auth === "object" && source.auth.type === "headers" && (
        <CustomWidgetAuthHeaderFields
          sourceId={source.id}
          headers={authHeaders}
          index={index}
          form={form}
          definitionId={definitionId}
          clearSecretPending={clearSecretPending}
          onUpdate={onUpdate}
          onSetSecret={onSetSecret}
          onClearSecret={onClearSecret}
        />
      )}
      {(secretFields[authType] ?? []).map(({ kind }) => {
        const secret = form.values.secrets.find((entry) => entry.sourceId === source.id && entry.kind === kind);
        const Input = kind === "username" ? TextInput : PasswordInput;
        return (
          <Group key={kind} align="end" wrap="nowrap">
            <Input
              style={{ flex: 1 }}
              label={tSecret(kind)}
              value={secret?.value ?? ""}
              placeholder={secret?.hasValue ? t("configured") : undefined}
              leftSection={<IconKey size={15} />}
              onChange={(event) => onSetSecret(source.id, kind, event.currentTarget.value)}
            />
            {definitionId && secret?.hasValue && (
              <Button
                type="button"
                color="red"
                variant="subtle"
                loading={clearSecretPending}
                onClick={() => void onClearSecret(source.id, kind)}
              >
                {t("clear")}
              </Button>
            )}
          </Group>
        );
      })}
    </>
  );
}

function CustomWidgetAuthHeaderFields({
  sourceId,
  headers,
  index,
  form,
  definitionId,
  clearSecretPending,
  onUpdate,
  onSetSecret,
  onClearSecret,
}: Pick<
  CustomWidgetSourceFieldProps,
  "index" | "form" | "definitionId" | "clearSecretPending" | "onUpdate" | "onSetSecret" | "onClearSecret"
> & {
  sourceId: string;
  headers: CustomWidgetAuthenticationHeader[];
}) {
  const t = useI18n("customWidget.workbench.sources");
  const tSecret = useI18n("customWidget.secret");
  const tCommon = useI18n("common");
  const updateHeaders = (next: CustomWidgetAuthenticationHeader[]) =>
    onUpdate(index, { auth: { type: "headers", headers: next } });
  const addHeader = () => {
    let suffix = 1;
    while (
      headers.some((header) => header.slot === `header${suffix}` || header.name.toLowerCase() === `x-header-${suffix}`)
    )
      suffix += 1;
    updateHeaders([...headers, { name: `X-Header-${suffix}`, slot: `header${suffix}` }]);
  };

  return (
    <Stack gap="sm">
      {headers.map((header, headerIndex) => {
        const kind = getCustomWidgetHeaderSecretKind(header.slot);
        const secret = form.values.secrets.find((entry) => entry.sourceId === sourceId && entry.kind === kind);
        return (
          <Stack key={header.slot} gap="xs">
            <Group grow align="start">
              <TextInput
                label={t("headerName")}
                maxLength={256}
                value={header.name}
                onChange={(event) =>
                  updateHeaders(
                    headers.map((entry, entryIndex) => {
                      if (entryIndex !== headerIndex) return entry;
                      return { ...entry, name: event.currentTarget.value };
                    }),
                  )
                }
              />
              <PasswordInput
                label={header.name || tSecret("apiKey")}
                value={secret?.value ?? ""}
                maxLength={8192}
                autoComplete="off"
                placeholder={secret?.hasValue ? t("configured") : undefined}
                leftSection={<IconKey size={15} />}
                onChange={(event) => onSetSecret(sourceId, kind, event.currentTarget.value)}
              />
            </Group>
            <Group justify="flex-end" gap="xs">
              {definitionId && secret?.hasValue && (
                <Button
                  type="button"
                  color="red"
                  variant="subtle"
                  loading={clearSecretPending}
                  onClick={() => void onClearSecret(sourceId, kind)}
                >
                  {t("clear")}
                </Button>
              )}
              <Button
                type="button"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={15} />}
                disabled={headers.length === 1}
                onClick={() => updateHeaders(headers.filter((_entry, entryIndex) => entryIndex !== headerIndex))}
              >
                {tCommon("action.remove")}
              </Button>
            </Group>
          </Stack>
        );
      })}
      <Button
        type="button"
        variant="light"
        leftSection={<IconPlus size={15} />}
        disabled={headers.length >= MAX_CUSTOM_WIDGET_AUTH_HEADERS}
        onClick={addHeader}
      >
        {tCommon("action.add")}
      </Button>
    </Stack>
  );
}
