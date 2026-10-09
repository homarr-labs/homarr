"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Stack, Text, TextInput } from "@mantine/core";
import { IconArrowRight, IconShieldCheck, IconUserPlus } from "@tabler/icons-react";
import type { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { signIn } from "@homarr/auth/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { UserCreatePasswordFields } from "@homarr/forms-collection";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { groupCreateSchema } from "@homarr/validation/group";
import { userInitSchema } from "@homarr/validation/user";

import { didCredentialsSignInFail } from "./account-recovery";
import { OnboardingAuthShell } from "./onboarding-auth-shell";
import type { OnboardingStudioProps } from "./types";
import { useOnboardingSounds } from "./use-onboarding-sounds";

const AccountShell = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <OnboardingAuthShell title={title} description={description} icon={<IconShieldCheck size={24} />}>
    {children}
  </OnboardingAuthShell>
);

export const AccountSetup = ({ environment }: OnboardingStudioProps) => {
  if (environment.currentStep === "user") return <CredentialsSetup />;
  return <ExternalGroupSetup />;
};

const CredentialsSetup = () => {
  const t = useI18n("init.studio.account");
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const recoveryActionRef = useRef<HTMLAnchorElement>(null);
  const sounds = useOnboardingSounds();
  const mutation = clientApi.user.initUser.useMutation({
    onError() {
      sounds.error();
      const message = t("unknownError");
      setSubmitError(message);
      showErrorNotification({ title: t("errorTitle"), message });
    },
  });
  const form = useZodForm(userInitSchema, {
    initialValues: { username: "", password: "", confirmPassword: "" },
  });

  const submitAsync = async (values: z.infer<typeof userInitSchema>) => {
    setSubmitError(null);
    try {
      await mutation.mutateAsync(values);
    } catch {
      return;
    }

    try {
      const result = await signIn("credentials", {
        name: values.username,
        password: values.password,
        redirect: false,
      });
      if (didCredentialsSignInFail(result)) throw new Error();
    } catch {
      sounds.warning();
      setRequiresSignIn(true);
      return;
    }

    await revalidatePathActionAsync("/init");
  };

  useEffect(() => {
    if (requiresSignIn) recoveryActionRef.current?.focus();
  }, [requiresSignIn]);

  if (requiresSignIn) {
    return (
      <AccountShell title={t("recoveryTitle")} description={t("recoveryDescription")}>
        <Button
          component={Link}
          href="/auth/login?callbackUrl=/init"
          ref={recoveryActionRef}
          size="md"
          rightSection={<IconArrowRight size={18} />}
        >
          {t("recoveryAction")}
        </Button>
      </AccountShell>
    );
  }

  return (
    <AccountShell title={t("title")} description={t("description")}>
      <form onSubmit={form.onSubmit((values) => submitAsync(values))}>
        <Stack gap="md">
          <TextInput label={t("username")} autoComplete="username" withAsterisk {...form.getInputProps("username")} />
          <UserCreatePasswordFields
            passwordInputProps={{ ...form.getInputProps("password"), autoComplete: "new-password" }}
            confirmPasswordInputProps={{ ...form.getInputProps("confirmPassword"), autoComplete: "new-password" }}
          />
          <Text size="sm" c="dimmed" my="xs">
            {t("passwordHint")}
          </Text>
          {submitError ? (
            <Alert color="red" title={t("errorTitle")}>
              {submitError}
            </Alert>
          ) : null}
          <Button type="submit" size="md" loading={form.submitting} rightSection={<IconArrowRight size={18} />}>
            {t("create")}
          </Button>
        </Stack>
      </form>
    </AccountShell>
  );
};

const ExternalGroupSetup = () => {
  const t = useI18n("init.studio.externalGroup");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const sounds = useOnboardingSounds();
  const mutation = clientApi.group.createInitialExternalGroup.useMutation({
    async onSuccess() {
      sounds.success();
      await revalidatePathActionAsync("/init");
    },
    onError() {
      sounds.error();
      const message = t("unknownError");
      setSubmitError(message);
      showErrorNotification({ title: t("errorTitle"), message });
    },
  });
  const form = useZodForm(groupCreateSchema, { initialValues: { name: "" } });

  return (
    <AccountShell title={t("title")} description={t("description")}>
      <form
        onSubmit={form.onSubmit((values) => {
          sounds.click();
          setSubmitError(null);
          mutation.mutate(values);
        })}
      >
        <Stack gap="md">
          <TextInput
            label={t("name")}
            description={t("nameDescription")}
            leftSection={<IconUserPlus size={16} />}
            withAsterisk
            {...form.getInputProps("name")}
          />
          {submitError ? (
            <Alert color="red" title={t("errorTitle")}>
              {submitError}
            </Alert>
          ) : null}
          <Button type="submit" size="md" loading={mutation.isPending} rightSection={<IconArrowRight size={18} />}>
            {t("continue")}
          </Button>
        </Stack>
      </form>
    </AccountShell>
  );
};
