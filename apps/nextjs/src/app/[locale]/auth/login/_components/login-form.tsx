"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  PasswordInput,
  rem,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { z } from "zod";

import { signIn } from "@alparr/auth/client";
import { useScopedI18n } from "@alparr/translation/client";
import { signInSchema } from "@alparr/validation";

export const LoginForm = () => {
  const t = useScopedI18n("user");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const form = useForm<FormType>({
    validate: zodResolver(signInSchema),
    initialValues: {
      name: "",
      password: "",
    },
  });

  const handleSubmit = async (values: FormType) => {
    setIsLoading(true);
    setError(undefined);
    await signIn("credentials", {
      ...values,
      redirect: false,
      callbackUrl: "/",
    })
      .then((response) => {
        if (!response?.ok) {
          throw response?.error;
        }

        void router.push("/");
      })
      .catch((error: Error | string) => {
        setIsLoading(false);
        setError(error.toString());
      });
  };

  return (
    <Stack gap="xl">
      <form onSubmit={form.onSubmit((v) => void handleSubmit(v))}>
        <Stack gap="lg">
          <TextInput
            label={t("field.username.label")}
            {...form.getInputProps("name")}
          />
          <PasswordInput
            label={t("field.password.label")}
            {...form.getInputProps("password")}
          />
          <Button type="submit" fullWidth loading={isLoading}>
            {t("action.login")}
          </Button>
        </Stack>
      </form>

      {error && (
        <Alert icon={<IconAlertTriangle size={rem(16)} />} color="red">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

type FormType = z.infer<typeof signInSchema>;
