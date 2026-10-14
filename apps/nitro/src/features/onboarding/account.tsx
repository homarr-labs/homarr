import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Button, Stack, Text, TextInput } from "@mantine/core";
import { IconArrowRight, IconShieldCheck, IconUserPlus } from "@tabler/icons-react";

import { isOnboardingAuthorityError, onboardingError } from "./errors";
import type { InitialUser, OnboardingProps } from "./types";

interface AccountClaimTarget {
  kind: "ready";
  expiresAt?: number;
}

type AccountSetupProps<Kind extends string, Secret extends string, Locale extends string> = OnboardingProps<
  Kind,
  Secret,
  Locale
> & { claimTarget: AccountClaimTarget; onAuthorityFailure(): void };

interface AccountRequestOwner {
  controller: AbortController;
  generation: number;
  pending: boolean;
}

function useAccountRequest(claimTarget: AccountClaimTarget, client: object, source: object, target: object) {
  const owner = useRef<AccountRequestOwner | null>(null);
  const [pending, setPending] = useState(false);

  useLayoutEffect(() => {
    const current: AccountRequestOwner = { controller: new AbortController(), generation: 0, pending: false };
    owner.current = current;
    setPending(false);
    return () => {
      if (owner.current === current) owner.current = null;
      current.generation += 1;
      current.controller.abort();
    };
  }, [claimTarget, client, source, target]);

  const begin = () => {
    const current = owner.current;
    if (!current || current.pending || current.controller.signal.aborted) return null;
    if (claimTarget.expiresAt !== undefined && claimTarget.expiresAt <= Date.now()) return null;
    const generation = ++current.generation;
    current.pending = true;
    setPending(true);
    const isCurrent = () =>
      owner.current === current &&
      current.generation === generation &&
      !current.controller.signal.aborted &&
      (claimTarget.expiresAt === undefined || claimTarget.expiresAt > Date.now());
    return {
      signal: current.controller.signal,
      isCurrent,
      finish() {
        if (!isCurrent()) return;
        current.pending = false;
        setPending(false);
      },
    };
  };

  return { pending, begin };
}

export function AccountSetup<Kind extends string, Secret extends string, Locale extends string>(
  props: AccountSetupProps<Kind, Secret, Locale>,
) {
  return props.source.normalizeOnboardingStep(props.environment.currentStep) === "user" ? (
    <CredentialsSetup {...props} />
  ) : (
    <ExternalGroupSetup {...props} />
  );
}

function CredentialsSetup<Kind extends string, Secret extends string, Locale extends string>({
  source,
  client,
  claimTarget,
  onAuthorityFailure,
  accountActions,
}: AccountSetupProps<Kind, Secret, Locale>) {
  const t = source.t;
  const [values, setValues] = useState<InitialUser>({ username: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const { pending, begin } = useAccountRequest(claimTarget, client, source, client.user.initUser);
  const recoveryRef = useRef<HTMLAnchorElement>(null);
  const PasswordFields = source.UserCreatePasswordFields;
  const Shell = source.presentation.AuthShell;
  const Link = source.presentation.Link;

  useEffect(() => {
    if (requiresSignIn) recoveryRef.current?.focus();
  }, [requiresSignIn]);

  const submit = async () => {
    if (accountActions !== "accepted" || pending || requiresSignIn) return;
    setSubmitError(null);
    const parsed = source.userInitSchema.safeParse(values, { error: source.validationErrorMap });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({});
    const request = begin();
    if (!request) return;
    try {
      await client.user.initUser(parsed.data, { signal: request.signal });
      if (!request.isCurrent()) return;
      setValues({ username: "", password: "", confirmPassword: "" });
      setRequiresSignIn(true);
    } catch (error) {
      if (!request.isCurrent()) return;
      setSubmitError(
        isOnboardingAuthorityError(error) ? onboardingError(error, t) : t("init.studio.account.unknownError"),
      );
      if (isOnboardingAuthorityError(error)) onAuthorityFailure();
    } finally {
      request.finish();
    }
  };

  if (requiresSignIn) {
    return (
      <Shell
        title={t("init.studio.account.recoveryTitle")}
        description={t("init.studio.account.recoveryDescription")}
        icon={<IconShieldCheck size={24} />}
      >
        <Alert color="yellow">{source.holds.signIn}</Alert>
        <Button
          component={Link}
          href="/auth/login?callbackUrl=%2Finit"
          ref={recoveryRef}
          size="md"
          rightSection={<IconArrowRight size={18} />}
        >
          {t("init.studio.account.recoveryAction")}
        </Button>
      </Shell>
    );
  }

  return (
    <Shell
      title={t("init.studio.account.title")}
      description={t("init.studio.account.description")}
      icon={<IconShieldCheck size={24} />}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Stack gap="md">
          <TextInput
            label={t("init.studio.account.username")}
            autoComplete="username"
            value={values.username}
            onChange={(event) => setValues({ ...values, username: event.currentTarget.value })}
            error={errors.username}
            disabled={pending}
            required
          />
          <PasswordFields
            passwordInputProps={{
              autoComplete: "new-password",
              value: values.password,
              onChange: (event) => setValues({ ...values, password: event.currentTarget.value }),
              error: errors.password,
              disabled: pending,
              required: true,
              visibilityToggleFocusable: true,
              visibilityToggleButtonProps: { "aria-label": t("user.field.password.label") },
            }}
            confirmPasswordInputProps={{
              autoComplete: "new-password",
              value: values.confirmPassword,
              onChange: (event) => setValues({ ...values, confirmPassword: event.currentTarget.value }),
              error: errors.confirmPassword,
              disabled: pending,
              required: true,
              visibilityToggleFocusable: true,
              visibilityToggleButtonProps: { "aria-label": t("user.field.passwordConfirm.label") },
            }}
          />
          <Text size="sm" c="dimmed" my="xs">
            {t("init.studio.account.passwordHint")}
          </Text>
          {submitError ? (
            <Alert color="red" role="alert">
              {submitError}
            </Alert>
          ) : null}
          {accountActions !== "accepted" ? (
            <Alert color="yellow" role="alert" id="onboarding-account-hold">
              {source.holds.account}
            </Alert>
          ) : null}
          <Button
            type="submit"
            size="md"
            loading={pending}
            disabled={accountActions !== "accepted"}
            aria-describedby={accountActions !== "accepted" ? "onboarding-account-hold" : undefined}
            rightSection={<IconArrowRight size={18} />}
          >
            {t("init.studio.account.create")}
          </Button>
        </Stack>
      </form>
    </Shell>
  );
}

function ExternalGroupSetup<Kind extends string, Secret extends string, Locale extends string>({
  source,
  client,
  claimTarget,
  onAuthorityFailure,
  accountActions,
  navigation,
}: AccountSetupProps<Kind, Secret, Locale>) {
  const t = source.t;
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { pending, begin } = useAccountRequest(claimTarget, client, source, client.group.createInitialExternalGroup);
  const [created, setCreated] = useState(false);
  const Shell = source.presentation.AuthShell;
  const Link = source.presentation.Link;

  const submit = async () => {
    if (accountActions !== "accepted" || pending || created) return;
    setSubmitError(null);
    const parsed = source.groupCreateSchema.safeParse({ name }, { error: source.validationErrorMap });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? t("init.studio.externalGroup.unknownError"));
      return;
    }
    setFieldError(null);
    const request = begin();
    if (!request) return;
    try {
      await client.group.createInitialExternalGroup(parsed.data, { signal: request.signal });
      if (!request.isCurrent()) return;
      setCreated(true);
      await navigation.reloadSetup();
    } catch (error) {
      if (!request.isCurrent()) return;
      setSubmitError(
        isOnboardingAuthorityError(error) ? onboardingError(error, t) : t("init.studio.externalGroup.unknownError"),
      );
      if (isOnboardingAuthorityError(error)) onAuthorityFailure();
    } finally {
      request.finish();
    }
  };

  return (
    <Shell
      title={t("init.studio.externalGroup.title")}
      description={t("init.studio.externalGroup.description")}
      icon={<IconShieldCheck size={24} />}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Stack gap="md">
          <TextInput
            label={t("init.studio.externalGroup.name")}
            description={t("init.studio.externalGroup.nameDescription")}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            error={fieldError}
            disabled={pending || created}
            required
            leftSection={<IconUserPlus size={16} />}
          />
          {submitError ? (
            <Alert color="red" role="alert">
              {submitError}
            </Alert>
          ) : null}
          {created ? (
            <Button component={Link} href="/init">
              {t("common.action.continue")}
            </Button>
          ) : (
            <Button
              type="submit"
              size="md"
              loading={pending}
              disabled={accountActions !== "accepted"}
              aria-describedby={accountActions !== "accepted" ? "onboarding-group-hold" : undefined}
              rightSection={<IconArrowRight size={18} />}
            >
              {t("init.studio.externalGroup.continue")}
            </Button>
          )}
          {accountActions !== "accepted" ? (
            <Alert color="yellow" role="alert" id="onboarding-group-hold">
              {source.holds.account}
            </Alert>
          ) : null}
        </Stack>
      </form>
    </Shell>
  );
}
