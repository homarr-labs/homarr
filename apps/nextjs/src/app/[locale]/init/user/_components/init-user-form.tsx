"use client";

import { useRouter } from "next/navigation";
import { Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import type { z } from "zod";

import { useScopedI18n } from "@alparr/translation/client";
import { initUserSchema } from "@alparr/validation";

import { showErrorNotification, showSuccessNotification } from "~/notification";
import { api } from "~/utils/api";

export const InitUserForm = () => {
  const router = useRouter();
  const t = useScopedI18n("user");
  const { mutateAsync, error, isPending } = api.user.initUser.useMutation();
  const form = useForm<FormType>({
    validate: zodResolver(initUserSchema),
    validateInputOnBlur: true,
    validateInputOnChange: true,
    initialValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: FormType) => {
    console.log(values);
    await mutateAsync(values, {
      onSuccess: () => {
        showSuccessNotification({
          title: "User created",
          message: "You can now log in",
        });
        router.push("/auth/login");
      },
      onError: () => {
        showErrorNotification({
          title: "User creation failed",
          message: error?.message ?? "Unknown error",
        });
      },
    });
  };

  return (
    <Stack gap="xl">
      <form
        onSubmit={form.onSubmit(
          (v) => void handleSubmit(v),
          (err) => console.log(err),
        )}
      >
        <Stack gap="lg">
          <TextInput
            label={t("field.username.label")}
            {...form.getInputProps("username")}
          />
          <PasswordInput
            label={t("field.password.label")}
            {...form.getInputProps("password")}
          />
          <PasswordInput
            label={t("field.passwordConfirm.label")}
            {...form.getInputProps("confirmPassword")}
          />
          <Button type="submit" fullWidth loading={isPending}>
            {t("action.create")}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};

type FormType = z.infer<typeof initUserSchema>;
