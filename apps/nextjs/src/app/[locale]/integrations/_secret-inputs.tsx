"use client";

import type { ChangeEventHandler, FocusEventHandler } from "react";

import { integrationSecretKindObject } from "@homarr/db/schema/items";
import type { IntegrationSecretKind } from "@homarr/db/schema/items";
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
  const Icon = integrationSecretIcons[kind];

  return (
    <TextInput
      {...props}
      label={props.label ?? kind}
      w="100%"
      leftSection={<Icon size={20} stroke={1.5} />}
    />
  );
};

const PrivateSecretInput = ({
  kind,
  ...props
}: IntegrationSecretInputProps) => {
  const Icon = integrationSecretIcons[kind];

  return (
    <PasswordInput
      {...props}
      label={props.label ?? kind}
      description="This secret can not be retrieved later."
      w="100%"
      leftSection={<Icon size={20} stroke={1.5} />}
    />
  );
};
