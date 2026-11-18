"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { PasswordInput } from "@mantine/core";
import type { PasswordInputProps } from "@mantine/core";

import { PasswordRequirementsPopover } from "./password-requirements-popover";

interface CustomPasswordInputProps extends PasswordInputProps {
  withPasswordRequirements?: boolean;
}

export const CustomPasswordInput = ({ withPasswordRequirements, ...props }: CustomPasswordInputProps) => {
  if (withPasswordRequirements) {
    return <WithPasswordRequirements {...props} />;
  }

  return <PasswordInput {...props} />;
};

const WithPasswordRequirements = (props: PasswordInputProps) => {
  const [password, setPassword] = useState(String(props.defaultValue ?? ""));
  const currentPassword = props.value === undefined ? password : String(props.value);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.currentTarget.value);
    props.onChange?.(event);
  };

  return (
    <PasswordRequirementsPopover password={currentPassword}>
      <PasswordInput {...props} onChange={onChange} />
    </PasswordRequirementsPopover>
  );
};
