"use client";

import { useRouter } from "next/navigation";

import { useForm, zodResolver } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { Button, PasswordInput, Stack, TextInput } from "@homarr/ui";
import type { z } from "@homarr/validation";
import { v } from "@homarr/validation";

import { api } from "~/utils/api";

export const InitUserForm = () => {
  const router = useRouter();
  const { mutateAsync, error, isPending } = api.user.initUser.useMutation();
  const form = useForm<FormType>({
    validate: zodResolver(v.user.init),
    validateInputOnBlur: true,
    validateInputOnChange: true,
    initialValues: {
      username: "",
      password: "",
      repeatPassword: "",
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
          <TextInput label="Username" {...form.getInputProps("username")} />
          <PasswordInput label="Password" {...form.getInputProps("password")} />
          <PasswordInput
            label="Repeat password"
            {...form.getInputProps("repeatPassword")}
          />
          <Button type="submit" fullWidth loading={isPending}>
            Create user
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};

type FormType = z.infer<typeof v.user.init>;
