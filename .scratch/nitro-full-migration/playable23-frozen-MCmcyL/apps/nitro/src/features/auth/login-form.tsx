import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { Button, Divider, PasswordInput, Stack, TextInput } from "@mantine/core";

import { userSignInSchema } from "@homarr/validation/user";

import type { AuthAttempt } from "./attempt-lifecycle";
import { useAuthAttemptLifecycle } from "./attempt-lifecycle";
import type {
  AuthCredentialProvider,
  AuthFailureCode,
  AuthFrontendNavigation,
  AuthFrontendTransport,
  AuthProvider,
  AuthUiMessages,
} from "./contracts";
import { AuthError } from "./feedback";
import { acceptsAuthProviderUrl, authReturnPath } from "./navigation";
import { AuthPasswordRecovery } from "./password-recovery";

export interface AuthLoginFormProps {
  providers: readonly AuthProvider[];
  oidcClientName: string;
  isOidcAutoLoginEnabled: boolean;
  callbackUrl?: string;
  hasProviderError?: boolean;
  transport: AuthFrontendTransport;
  navigation: AuthFrontendNavigation;
  messages: AuthUiMessages;
}

export function AuthLoginForm({
  providers,
  oidcClientName,
  isOidcAutoLoginEnabled,
  callbackUrl,
  hasProviderError = false,
  transport,
  navigation,
  messages,
}: AuthLoginFormProps) {
  const id = useId();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: false, password: false });
  const [error, setError] = useState<AuthFailureCode | null>(hasProviderError ? "provider-error" : null);
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const autoLoginStarted = useRef(false);
  const returnPath = authReturnPath(callbackUrl);
  const resetAttemptState = useCallback(() => {
    setPassword("");
    setPending(null);
  }, []);
  const beginAttempt = useAuthAttemptLifecycle(
    transport,
    navigation,
    JSON.stringify([providers, returnPath, hasProviderError, isOidcAutoLoginEnabled]),
    resetAttemptState,
  );
  const credentialProviders = providers.filter(
    (provider): provider is AuthCredentialProvider => provider === "credentials" || provider === "ldap",
  );
  const defaultProvider = credentialProviders.includes("credentials") ? "credentials" : "ldap";
  const providerAvailable = useCallback(
    (provider: AuthProvider) =>
      Boolean(
        transport.readCsrfToken &&
        (provider === "credentials"
          ? transport.signInCredentials
          : provider === "ldap"
            ? transport.signInLdap
            : transport.beginOidc),
      ),
    [transport, transport.readCsrfToken, transport.signInCredentials, transport.signInLdap, transport.beginOidc],
  );

  const runSignIn = useCallback(
    async (provider: AuthProvider, attempt: AuthAttempt) => {
      try {
        if (!attempt.isCurrent() || !transport.readCsrfToken) return;
        const csrf = await transport.readCsrfToken(attempt.options);
        if (!attempt.isCurrent()) return;
        if (csrf.status === "rejected") {
          setError(csrf.code);
          return;
        }
        if (csrf.status !== "ready" || !csrf.token) {
          setError("csrf-rejected");
          return;
        }
        if (provider === "oidc") {
          if (!transport.beginOidc) {
            setError("unavailable");
            return;
          }
          const response = await transport.beginOidc(
            { csrfToken: csrf.token, callbackUrl: returnPath },
            attempt.options,
          );
          if (!attempt.isCurrent()) return;
          if (response.status === "rejected") {
            setError(response.code);
            return;
          }
          if (response.status !== "redirect" || !acceptsAuthProviderUrl(navigation, response.url, "sign-in")) {
            if (!attempt.isCurrent()) return;
            setError("provider-error");
            return;
          }
          if (!attempt.isCurrent()) return;
          await navigation.providerRedirect(response.url, attempt.options);
          if (!attempt.isCurrent()) return;
          return;
        }
        const method = provider === "credentials" ? transport.signInCredentials : transport.signInLdap;
        if (!method || !attempt.credentials) {
          setError("unavailable");
          return;
        }
        if (!attempt.isCurrent()) return;
        const request = method(
          { ...attempt.credentials, csrfToken: csrf.token, callbackUrl: returnPath },
          attempt.options,
        );
        attempt.releaseCredentials();
        const response = await request;
        if (!attempt.isCurrent()) return;
        setPassword("");
        if (response.status === "rejected") {
          setError(response.code);
          return;
        }
        if (response.status !== "authenticated") {
          setError("unavailable");
          return;
        }
        if (!attempt.isCurrent()) return;
        await navigation.returnTo(returnPath, attempt.options);
        if (!attempt.isCurrent()) return;
      } catch {
        if (attempt.isCurrent()) setError("unavailable");
      } finally {
        if (attempt.finish()) {
          setPassword("");
          setPending(null);
        }
      }
    },
    [navigation, returnPath, transport],
  );

  const signIn = useCallback(
    (provider: AuthProvider, credentials?: { name: string; password: string }) => {
      const attempt = beginAttempt(credentials);
      if (!attempt) return;
      if (!providers.includes(provider) || !providerAvailable(provider)) {
        attempt.finish();
        setError("unavailable");
        return;
      }
      setPending(provider);
      setError(null);
      void runSignIn(provider, attempt);
    },
    [beginAttempt, providerAvailable, providers, runSignIn],
  );

  useEffect(() => {
    if (
      !hasProviderError &&
      isOidcAutoLoginEnabled &&
      providers.includes("oidc") &&
      providerAvailable("oidc") &&
      !autoLoginStarted.current
    ) {
      autoLoginStarted.current = true;
      void signIn("oidc");
    }
  }, [hasProviderError, isOidcAutoLoginEnabled, providerAvailable, providers, signIn]);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = event.nativeEvent.submitter;
    const requestedProvider = submitter instanceof HTMLButtonElement ? submitter.value : defaultProvider;
    const provider = requestedProvider === "ldap" ? "ldap" : "credentials";
    const parsed = userSignInSchema.safeParse({ name, password });
    setFieldErrors({ name: name.length === 0, password: password.length === 0 });
    if (!parsed.success) return;
    void signIn(provider, parsed.data);
  };

  const unavailable = providers.length === 0 || providers.some((provider) => !providerAvailable(provider));

  return (
    <Stack gap="lg" aria-busy={pending !== null}>
      {error || unavailable ? <AuthError code={error ?? "unavailable"} messages={messages} /> : null}
      {credentialProviders.length > 0 ? (
        <form autoComplete="on" noValidate onSubmit={submit}>
          <Stack gap="lg">
            <TextInput
              id={`${id}-username`}
              name="username"
              label={messages.username}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={name}
              disabled={pending !== null}
              error={fieldErrors.name ? messages.usernameRequired : undefined}
              onChange={(event) => {
                setName(event.currentTarget.value);
                setFieldErrors((value) => ({ ...value, name: false }));
              }}
            />
            <PasswordInput
              id={`${id}-password`}
              name="password"
              label={messages.password}
              autoComplete="current-password"
              required
              value={password}
              disabled={pending !== null}
              visibilityToggleButtonProps={{ "aria-label": messages.passwordVisibility }}
              error={fieldErrors.password ? messages.passwordRequired : undefined}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
                setFieldErrors((value) => ({ ...value, password: false }));
              }}
            />
            {credentialProviders.map((provider) => (
              <Stack key={provider} gap="sm">
                <Button
                  type="submit"
                  name="provider"
                  value={provider}
                  fullWidth
                  loading={pending === provider}
                  disabled={pending !== null || !providerAvailable(provider)}
                >
                  {provider === "credentials" ? messages.signIn : messages.signInWith("LDAP")}
                </Button>
                {provider === "credentials" ? <AuthPasswordRecovery username={name} messages={messages} /> : null}
              </Stack>
            ))}
          </Stack>
        </form>
      ) : null}
      {credentialProviders.length > 0 && providers.includes("oidc") ? (
        <Divider label="OIDC" labelPosition="center" />
      ) : null}
      {providers.includes("oidc") ? (
        <Button
          type="button"
          fullWidth
          variant="light"
          loading={pending === "oidc"}
          disabled={pending !== null || !providerAvailable("oidc")}
          onClick={() => void signIn("oidc")}
        >
          {messages.signInWith(oidcClientName)}
        </Button>
      ) : null}
    </Stack>
  );
}
