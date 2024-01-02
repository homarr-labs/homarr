"use client";

import type { ChangeEventHandler, FocusEventHandler } from "react";

import { integrationSecretKindObject } from "@homarr/definitions";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { PasswordInput, TextInput } from "@homarr/ui";

import { integrationSecretIcons } from "./_secret-icons";

interface IntegrationSecretInputProps {
  label?: string;
  kind: IntegrationSecretKind;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  error?: string;
}

export const IntegrationSecretInput = (props: IntegrationSecretInputProps) => {
  const { isPublic } = integrationSecretKindObject[props.kind];

  if (isPublic) return <PublicSecretInput {...props} />;

  return <PrivateSecretInput {...props} />;
};

const PublicSecretInput = ({ kind, ...props }: IntegrationSecretInputProps) => {
  const t = useI18n();
  const Icon = integrationSecretIcons[kind];

  return (
    <TextInput
      {...props}
      label={props.label ?? t(`integration.secrets.kind.${kind}.label`)}
      w="100%"
      leftSection={<Icon size={20} stroke={1.5} />}
    />
  );
};

const PrivateSecretInput = ({
  kind,
  ...props
}: IntegrationSecretInputProps) => {
  const t = useI18n();
  const Icon = integrationSecretIcons[kind];

  return (
    <PasswordInput
      {...props}
      label={props.label ?? t(`integration.secrets.kind.${kind}.label`)}
      description={t(`integration.secrets.secureNotice`)}
      w="100%"
      leftSection={<Icon size={20} stroke={1.5} />}
    />
  );
};
