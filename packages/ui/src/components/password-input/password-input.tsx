"use client";

import type { PasswordInputProps } from "@mantine/core";
import { PasswordInput } from "@mantine/core";
import type { ChangeEvent } from "react";
import { useState } from "react";

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
  const [value, setValue] = useState("");

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.currentTarget.value);
    props.onChange?.(event);
  };

  return (
    <PasswordRequirementsPopover password={value}>
      <PasswordInput {...props} onChange={onChange} />
    </PasswordRequirementsPopover>
  );
};
