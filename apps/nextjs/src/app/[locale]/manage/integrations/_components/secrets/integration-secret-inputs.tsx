"use client";

import type { ChangeEventHandler, FocusEventHandler } from "react";
import { PasswordInput, Textarea, TextInput } from "@mantine/core";

import { integrationSecretKindObject } from "@homarr/definitions";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { integrationSecretIcons } from "./integration-secret-icons";

interface IntegrationSecretInputProps {
  withAsterisk?: boolean;
  label?: string;
  kind: IntegrationSecretKind;
  value?: string;
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onFocus?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  error?: string;
}

export const IntegrationSecretInput = (props: IntegrationSecretInputProps) => {
  const { isPublic } = integrationSecretKindObject[props.kind];

  if (isPublic) return <PublicSecretInput {...props} />;

  return <PrivateSecretInput {...props} />;
};

const PublicSecretInput = ({ kind, ...props }: IntegrationSecretInputProps) => {
  const tIntegration = useI18n("integration");
  const Icon = integrationSecretIcons[kind];
  const { multiline } = integrationSecretKindObject[kind];
  if (multiline) {
    return (
      <Textarea
        {...props}
        label={props.label ?? tIntegration(`secrets.kind.${kind}.label` as never)}
        w="100%"
        leftSection={<Icon size={20} stroke={1.5} />}
        autosize
        minRows={2}
      />
    );
  }

  return (
    <TextInput
      {...props}
      label={props.label ?? tIntegration(`secrets.kind.${kind}.label` as never)}
      w="100%"
      leftSection={<Icon size={20} stroke={1.5} />}
    />
  );
};

const PrivateSecretInput = ({ kind, ...props }: IntegrationSecretInputProps) => {
  const tIntegration = useI18n("integration");
  const Icon = integrationSecretIcons[kind];
  const { multiline } = integrationSecretKindObject[kind];

  if (multiline) {
    return (
      <Textarea
        {...props}
        label={props.label ?? tIntegration(`secrets.kind.${kind}.label` as never)}
        description={tIntegration("secrets.secureNotice")}
        w="100%"
        leftSection={<Icon size={20} stroke={1.5} />}
        autosize
        minRows={2}
      />
    );
  }

  return (
    <PasswordInput
      {...props}
      label={props.label ?? tIntegration(`secrets.kind.${kind}.label` as never)}
      description={tIntegration("secrets.secureNotice")}
      w="100%"
      leftSection={<Icon size={20} stroke={1.5} />}
    />
  );
};
