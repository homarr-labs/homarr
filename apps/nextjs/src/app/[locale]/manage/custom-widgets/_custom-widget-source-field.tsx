"use client";

import { Button, Fieldset, Group, PasswordInput, Select, Stack, TextInput } from "@mantine/core";
import { IconKey, IconTrash } from "@tabler/icons-react";

import { getCustomWidgetSourceUrlIssue } from "@homarr/custom-widgets/core";
import type { CustomWidgetSource, CustomWidgetSourceUrlIssue } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { CustomWidgetIdentifierInput } from "./_custom-widget-identifier-input";

type SecretKind = "apiKey" | "username" | "password";

const secretFields: Record<string, Array<{ kind: SecretKind }>> = {
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
}: CustomWidgetSourceFieldProps) {
  const t = useI18n("customWidget.workbench.sources");
  const tSecret = useI18n("customWidget.secret");
  const baseUrlIssue = getCustomWidgetSourceUrlIssue(source.baseUrl);
  const authType = typeof source.auth === "string" ? source.auth : source.auth.type;

  return (
    <Fieldset legend={index === 0 ? t("primary") : source.name}>
      <Stack gap="sm">
        <Group grow align="start">
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
        <TextInput
          label={t("baseUrl")}
          type="url"
          value={source.baseUrl}
          error={baseUrlIssue ? t(sourceUrlErrorKeys[baseUrlIssue]) : undefined}
          onChange={(event) => onUpdate(index, { baseUrl: event.currentTarget.value })}
        />
        <Group grow align="start">
          <Select
            label={t("networkScope")}
            data={["public", "private", "loopback"]}
            value={source.networkScope}
            onChange={(value) =>
              value && onUpdate(index, { networkScope: value as CustomWidgetSource["networkScope"] })
            }
            allowDeselect={false}
          />
          <Select
            label={t("authentication")}
            data={["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"]}
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
