import type { ReactNode } from "react";
import React from "react";
import type { MantineSpacing } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import { SettingSwitchView } from "@homarr/ui/source-views/identity-settings";

type BooleanKeys<TFormValue> = {
  [TKey in keyof TFormValue]: TFormValue[TKey] extends boolean ? TKey : never;
}[keyof TFormValue];

export const SwitchSetting = <TFormValue extends Record<string, unknown>>({
  form,
  ms,
  title,
  text,
  formKey,
  disabled,
}: {
  form: UseFormReturnType<TFormValue, TFormValue>;
  formKey: string & BooleanKeys<TFormValue>;
  ms?: MantineSpacing;
  title: string;
  text: ReactNode;
  disabled?: boolean;
}) => {
  const handleClick = React.useCallback(() => {
    if (disabled) {
      return;
    }

    form.setFieldValue(formKey, (previous) => !previous as never);
  }, [form, formKey, disabled]);

  return (
    <SettingSwitchView
      ms={ms}
      title={title}
      text={text}
      disabled={disabled}
      onToggle={handleClick}
      checked={Boolean(form.values[formKey])}
    />
  );
};
