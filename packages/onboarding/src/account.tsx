"use client";

import { Alert, Button, Group, Paper, Stack, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconShieldCheck, IconUserPlus } from "@tabler/icons-react";
import type { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { signIn } from "@homarr/auth/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { UserCreatePasswordFields } from "@homarr/forms-collection";
import { useScopedI18n } from "@homarr/translation/client";
import { groupCreateSchema } from "@homarr/validation/group";
import { userInitSchema } from "@homarr/validation/user";

import type { OnboardingStudioProps } from "./types";
import classes from "./onboarding-studio.module.css";

const AccountShell = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <main className={classes.page}>
    <div className={classes.shell}>
      <Stack mih="calc(100dvh - 6rem)" justify="center" align="center">
        <Paper className={classes.studio} radius="lg" p={{ base: "lg", sm: "xl" }} w="100%" maw="36rem">
          <Stack gap="xl">
            <Group wrap="nowrap" align="flex-start">
              <ThemeIcon size="xl" radius="lg" variant="light">
                <IconShieldCheck size={24} />
              </ThemeIcon>
              <Stack gap={4}>
                <Title order={1} size="h2">
                  {title}
                </Title>
                <Text c="dimmed">{description}</Text>
              </Stack>
            </Group>
            {children}
          </Stack>
        </Paper>
      </Stack>
    </div>
  </main>
);

export const AccountSetup = ({ environment }: OnboardingStudioProps) => {
  if (environment.currentStep === "user") return <CredentialsSetup />;
  return <ExternalGroupSetup />;
};

const CredentialsSetup = () => {
  const t = useScopedI18n("init.studio.account");
  const mutation = clientApi.user.initUser.useMutation();
  const form = useZodForm(userInitSchema, {
    initialValues: { username: "", password: "", confirmPassword: "" },
  });

  const submitAsync = async (values: z.infer<typeof userInitSchema>) => {
    try {
      await mutation.mutateAsync(values);
      const result = await signIn("credentials", {
        name: values.username,
        password: values.password,
        redirect: false,
      });
      if (result?.error) throw new Error(t("signInError"));
      await revalidatePathActionAsync("/init");
    } catch (error) {
      form.setErrors({ username: error instanceof Error ? error.message : t("unknownError") });
    }
  };

  return (
    <AccountShell title={t("title")} description={t("description")}>
      <form onSubmit={form.onSubmit((values) => void submitAsync(values))}>
        <Stack gap="md">
          <TextInput label={t("username")} autoComplete="username" withAsterisk {...form.getInputProps("username")} />
          <UserCreatePasswordFields
            passwordInputProps={{ ...form.getInputProps("password"), autoComplete: "new-password" }}
            confirmPasswordInputProps={{ ...form.getInputProps("confirmPassword"), autoComplete: "new-password" }}
          />
          {mutation.error ? (
            <Alert color="red" title={t("errorTitle")}>
              {mutation.error.message}
            </Alert>
          ) : null}
          <Button type="submit" size="md" loading={mutation.isPending} rightSection={<IconArrowRight size={18} />}>
            {t("create")}
          </Button>
        </Stack>
      </form>
    </AccountShell>
  );
};

const ExternalGroupSetup = () => {
  const t = useScopedI18n("init.studio.externalGroup");
  const mutation = clientApi.group.createInitialExternalGroup.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/init");
    },
  });
  const form = useZodForm(groupCreateSchema, { initialValues: { name: "" } });

  return (
    <AccountShell title={t("title")} description={t("description")}>
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack gap="md">
          <TextInput
            label={t("name")}
            description={t("nameDescription")}
            leftSection={<IconUserPlus size={16} />}
            withAsterisk
            {...form.getInputProps("name")}
          />
          {mutation.error ? (
            <Alert color="red" title={t("errorTitle")}>
              {mutation.error.message}
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
