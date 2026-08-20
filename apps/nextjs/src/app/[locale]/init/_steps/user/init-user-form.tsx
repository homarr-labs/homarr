"use client";

import { Button, Stack, TextInput } from "@mantine/core";
import type { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { signIn } from "@homarr/auth/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { UserCreatePasswordFields } from "@homarr/forms-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { userInitSchema } from "@homarr/validation/user";

export const InitUserForm = () => {
  const t = useScopedI18n("user");
  const tUser = useScopedI18n("init.step.user");
  const { mutateAsync } = clientApi.user.initUser.useMutation();
  const form = useZodForm(userInitSchema, {
    initialValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  /**
   * The step advances only once the session exists and `/init` has been revalidated, so the submit
   * resolves after both rather than after the user row is written. A sign-in that fails reports the
   * reason and leaves the form on this step.
   */
  const showFailureNotification = (reason: unknown) => {
    showErrorNotification({
      title: tUser("notification.error.title"),
      message: reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "",
    });
  };

  const handleSubmitAsync = async (values: FormType) => {
    try {
      await mutateAsync(values);
    } catch (error) {
      showFailureNotification(error);
      return;
    }

    showSuccessNotification({
      title: tUser("notification.success.title"),
      message: tUser("notification.success.message"),
    });

    try {
      const signInResult = await signIn("credentials", {
        name: values.username,
        password: values.password,
        redirect: false,
      });

      if (signInResult?.error) {
        showFailureNotification(signInResult.error);
        return;
      }

      await revalidatePathActionAsync("/init");
    } catch (error) {
      showFailureNotification(error);
    }
  };

  return (
    <Stack gap="xl">
      <form
        onSubmit={form.onSubmit(
          (values) => handleSubmitAsync(values),
          (err) => console.log(err),
        )}
      >
        <Stack gap="lg">
          <TextInput label={t("field.username.label")} {...form.getInputProps("username")} />
          <UserCreatePasswordFields
            passwordInputProps={form.getInputProps("password")}
            confirmPasswordInputProps={form.getInputProps("confirmPassword")}
          />
          <Button type="submit" fullWidth loading={form.submitting}>
            {t("action.create")}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};

type FormType = z.infer<typeof userInitSchema>;
