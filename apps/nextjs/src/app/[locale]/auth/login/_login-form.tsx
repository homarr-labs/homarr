"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Divider,
  PasswordInput,
  rem,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { signIn } from "@homarr/auth/client";
import { useForm, zodResolver } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

interface LoginFormProps {
  providers: string[];
  isOidcAutoLoginEnabled: boolean;
  callbackUrl: string;
}

export const LoginForm = ({
  providers,
  isOidcAutoLoginEnabled,
  callbackUrl,
}: LoginFormProps) => {
  const t = useScopedI18n("user");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();
  const form = useForm<FormType>({
    validate: zodResolver(validation.user.signIn),
    initialValues: {
      provider: "",
      name: "",
      password: "",
    },
  });

  const credentialInputsVisible =
    providers.includes("credentials") || providers.includes("ldap");

  const onSuccess = useCallback(
    (response: Awaited<ReturnType<typeof signIn>>) => {
      if ((response && !response.ok) || response?.error) {
        throw response?.error;
      }

      showSuccessNotification({
        title: t("action.login.notification.success.title"),
        message: t("action.login.notification.success.message"),
      });

      // Redirect to the callback URL if the response is defined and comes from a credentials provider (ldap or credentials). oidc is redirected automatically.
      if (response) {
        void router.push(callbackUrl);
      }
    },
    [t, router, callbackUrl],
  );

  const onError = useCallback(
    (error: Error | string) => {
      setIsPending(false);
      setError(error.toString());
      showErrorNotification({
        title: t("action.login.notification.error.title"),
        message: t("action.login.notification.error.message"),
      });
    },
    [t],
  );

  const signInAsync = useCallback(
    async (provider: string, options?: Parameters<typeof signIn>[1]) => {
      setIsPending(true);
      setError(undefined);
      return await signIn(provider, {
        ...options,
        redirect: false,
        callbackUrl,
      })
        .then(onSuccess)
        .catch(onError);
    },
    [setIsPending, setError, onSuccess, onError, callbackUrl],
  );

  const isLoginInProgress = useRef(false);

  useEffect(() => {
    if (
      isOidcAutoLoginEnabled &&
      !error &&
      !isPending &&
      !isLoginInProgress.current
    ) {
      isLoginInProgress.current = true;
      void signInAsync("oidc");
    }
  }, [signInAsync, isOidcAutoLoginEnabled, error, isPending]);

  return (
    <Stack gap="xl">
      <Stack gap="lg">
        {credentialInputsVisible && (
          <>
            <form
              onSubmit={form.onSubmit(
                ({ provider, ...credentials }) =>
                  void signInAsync(provider, credentials),
              )}
            >
              <Stack gap="lg">
                <TextInput
                  label={t("field.username.label")}
                  {...form.getInputProps("name")}
                />
                <PasswordInput
                  label={t("field.password.label")}
                  {...form.getInputProps("password")}
                />

                {providers.includes("credentials") && (
                  <SubmitButton
                    isPending={isPending}
                    form={form}
                    provider="credentials"
                  >
                    {t("action.login.label")}
                  </SubmitButton>
                )}

                {providers.includes("ldap") && (
                  <SubmitButton
                    isPending={isPending}
                    form={form}
                    provider="ldap"
                  >
                    {t("action.login.label")} with LDAP
                  </SubmitButton>
                )}
              </Stack>
            </form>
            {providers.includes("oidc") && (
              <Divider label="OIDC" labelPosition="center" />
            )}
          </>
        )}

        {providers.includes("oidc") && (
          <Button
            fullWidth
            variant="light"
            onClick={async () => await signInAsync("oidc")}
          >
            Continue with OIDC
          </Button>
        )}
      </Stack>

      {error && (
        <Alert icon={<IconAlertTriangle size={rem(16)} />} color="red">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

interface SubmitButtonProps {
  isPending: boolean;
  form: ReturnType<typeof useForm<FormType, (values: FormType) => FormType>>;
  provider: string;
}

const SubmitButton = ({
  isPending,
  form,
  provider,
  children,
}: PropsWithChildren<SubmitButtonProps>) => {
  return (
    <Button
      type="submit"
      fullWidth
      onClick={() => form.setFieldValue("provider", provider)}
      loading={isPending && form.getValues().provider === provider}
      disabled={isPending && form.getValues().provider !== provider}
    >
      {children}
    </Button>
  );
};

type FormType = z.infer<typeof validation.user.signIn> & {
  provider: string;
};
