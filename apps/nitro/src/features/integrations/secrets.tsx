import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, Fieldset, Group, Modal, PasswordInput, Stack, Text, Textarea, TextInput } from "@mantine/core";

import type { IntegrationSecretKind } from "@homarr/definitions";
import { integrationSecretKindObject } from "@homarr/definitions";
import { useFormatter, useI18n } from "@homarr/translation/standalone/client";
import { IntegrationSecretKindsView } from "@homarr/ui/source-views/connections";

import type { IntegrationDetail } from "./client";
import { integrationSecretIcons } from "./secret-icons";
import { IntegrationSecretPresentation } from "../../source-ui/integrations";

export interface SecretDraft {
  kind: IntegrationSecretKind;
  value: string;
}

export function SecretKindsControl({
  options,
  secrets,
  onChange,
  disabled,
}: {
  options: IntegrationSecretKind[][];
  secrets: SecretDraft[];
  onChange: (secrets: SecretDraft[]) => void;
  disabled: boolean;
}) {
  const t = useI18n();
  return (
    <Fieldset variant="unstyled" disabled={disabled} p={0} m={0} miw={0}>
      <IntegrationSecretKindsView
        key={secrets.map((secret) => secret.kind).join("-") || "empty"}
        defaultValue={secrets.map((secret) => secret.kind).join("-") || "empty"}
        data={options.map((kinds) => ({
          value: kinds.join("-") || "empty",
          label:
            kinds.length === 0
              ? t("integration.secrets.noSecretsRequired.segmentTitle")
              : kinds.map((kind) => t(`integration.secrets.kind.${kind}.label`)).join(" & "),
        }))}
        onChange={(value) => {
          const kinds = options.find((option) => (option.join("-") || "empty") === value);
          if (kinds) onChange(kinds.map((kind) => ({ kind, value: "" })));
        }}
      />
    </Fieldset>
  );
}

export function IntegrationSecretInput({
  kind,
  value,
  onChange,
  label,
  error,
  required,
  disabled,
}: {
  kind: IntegrationSecretKind;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const t = useI18n();
  const definition = integrationSecretKindObject[kind];
  const Icon = integrationSecretIcons[kind];
  const props = {
    label: label ?? t(`integration.secrets.kind.${kind}.label`),
    value,
    error,
    disabled,
    withAsterisk: required,
    description: definition.isPublic ? undefined : t("integration.secrets.secureNotice"),
    autoComplete: "off",
    w: "100%",
    leftSection: <Icon size={20} stroke={1.5} />,
  };
  if (definition.multiline)
    return <Textarea {...props} autosize minRows={2} onChange={(event) => onChange(event.currentTarget.value)} />;
  if (definition.isPublic) return <TextInput {...props} onChange={(event) => onChange(event.currentTarget.value)} />;
  return <PasswordInput {...props} onChange={(event) => onChange(event.currentTarget.value)} />;
}

export function IntegrationSecretCard({
  kind,
  secret,
  changed,
  reset,
  disabled,
  children,
}: {
  kind: IntegrationSecretKind;
  secret: IntegrationDetail["secrets"][number] | undefined;
  changed: boolean;
  reset: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  const t = useI18n();
  const format = useFormatter();
  const [confirming, setConfirming] = useState(false);
  const confirmation = useRef<((confirmed: boolean) => void) | null>(null);
  useLayoutEffect(
    () => () => {
      confirmation.current?.(false);
      confirmation.current = null;
    },
    [],
  );
  const settle = (confirmed: boolean) => {
    if (confirmed) reset();
    confirmation.current?.(confirmed);
    confirmation.current = null;
    setConfirming(false);
  };
  const Icon = integrationSecretIcons[kind];
  return (
    <>
      <IntegrationSecretPresentation
        display={
          integrationSecretKindObject[kind].isPublic
            ? { kind: "public", value: secret?.value ?? null }
            : { kind: "redacted" }
        }
        kindIcon={<Icon size={16} />}
        kindLabel={t(`integration.secrets.kind.${kind}.label`)}
        lastUpdated={
          secret?.updatedAt
            ? t("integration.secrets.lastUpdated", { date: format.relativeTime(new Date(secret.updatedAt)) })
            : null
        }
        disabled={disabled}
        copy={{
          notSetTooltip: t("integration.secrets.notSet.tooltip"),
          notSetLabel: t("integration.secrets.notSet.label"),
          show: t("common.action.show"),
          hide: t("common.action.hide"),
          edit: t("common.action.edit"),
          cancel: t("common.action.cancel"),
        }}
        onCancel={() => {
          if (!changed) return Promise.resolve(true);
          confirmation.current?.(false);
          return new Promise<boolean>((resolve) => {
            confirmation.current = resolve;
            setConfirming(true);
          });
        }}
      >
        {children}
      </IntegrationSecretPresentation>
      <Modal
        opened={confirming}
        onClose={() => settle(false)}
        title={t("integration.secrets.reset.title")}
        centered
        transitionProps={{ duration: 0 }}
      >
        <Stack>
          <Text>{t("integration.secrets.reset.message")}</Text>
          <Group justify="end">
            <Button variant="default" onClick={() => settle(false)}>
              {t("common.action.cancel")}
            </Button>
            <Button
              onClick={() => {
                settle(true);
              }}
            >
              {t("common.action.confirm")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
