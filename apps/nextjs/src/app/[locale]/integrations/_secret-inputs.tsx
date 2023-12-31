"use client";

import type { ChangeEventHandler, FocusEventHandler } from "react";

import { integrationSecretSortObject } from "@homarr/db/schema/items";
import type { IntegrationSecretSort } from "@homarr/db/schema/items";
import { PasswordInput, TextInput } from "@homarr/ui";

import { integrationSecretIcons } from "./_secret-icons";

interface IntegrationSecretInputProps {
  label?: string;
  sort: IntegrationSecretSort;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  error?: string;
}

export const IntegrationSecretInput = (props: IntegrationSecretInputProps) => {
  const { isPublic } = integrationSecretSortObject[props.sort];

  if (isPublic) return <PublicSecretInput {...props} />;

  return <PrivateSecretInput {...props} />;
};

const PublicSecretInput = ({ sort, ...props }: IntegrationSecretInputProps) => {
  const Icon = integrationSecretIcons[sort];

  return (
    <TextInput
      {...props}
      label={props.label ?? sort}
      w="100%"
      leftSection={<Icon size={20} stroke={1.5} />}
    />
  );
};

const PrivateSecretInput = ({
  sort,
  ...props
}: IntegrationSecretInputProps) => {
  const Icon = integrationSecretIcons[sort];

  return (
    <PasswordInput
      {...props}
      label={props.label ?? sort}
      description="This secret can not be retrieved later."
      w="100%"
      leftSection={<Icon size={20} stroke={1.5} />}
    />
  );
};
