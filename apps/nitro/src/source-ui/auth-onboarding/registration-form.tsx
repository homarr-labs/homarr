import { useId, useState } from "react";
import { Alert, Button, PasswordInput, Stack, TextInput } from "@mantine/core";

import { userRegistrationSchema } from "@homarr/validation/user";

import type { RegistrationPresentation } from "./contracts";

export function AuthRegistrationForm({
  PasswordInput: SourcePasswordInput,
  t,
  validationErrorMap,
  hold,
}: RegistrationPresentation) {
  const id = useId();
  const [values, setValues] = useState({ username: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };
  return (
    <Stack gap="xl">
      <form
        autoComplete="on"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = userRegistrationSchema.safeParse(values, { error: validationErrorMap });
          if (!parsed.success) {
            setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
            return;
          }
          setValues((current) => ({ ...current, password: "", confirmPassword: "" }));
          setErrors({});
        }}
      >
        <Stack gap="lg">
          <TextInput
            label={t("user.field.username.label")}
            id={`${id}-username`}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            name="username"
            value={values.username}
            onChange={(event) => update("username", event.currentTarget.value)}
            error={errors.username}
            required
          />
          <SourcePasswordInput
            withPasswordRequirements
            label={t("user.field.password.label")}
            id={`${id}-password`}
            autoComplete="new-password"
            name="password"
            value={values.password}
            onChange={(event) => update("password", event.currentTarget.value)}
            error={errors.password}
            required
          />
          <PasswordInput
            label={t("user.field.passwordConfirm.label")}
            id={`${id}-password-confirm`}
            autoComplete="new-password"
            name="password-confirmation"
            value={values.confirmPassword}
            onChange={(event) => update("confirmPassword", event.currentTarget.value)}
            error={errors.confirmPassword}
            required
            visibilityToggleFocusable
          />
          <Alert color="yellow" role="alert" id={`${id}-registration-hold`}>
            {hold}
          </Alert>
          <Button type="submit" fullWidth disabled aria-describedby={`${id}-registration-hold`}>
            {t("user.action.register.label")}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
