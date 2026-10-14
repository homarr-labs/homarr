import { useCallback, useState } from "react";
import { Button, Stack } from "@mantine/core";

import { useAuthAttemptLifecycle } from "./attempt-lifecycle";
import type { AuthFailureCode, AuthFrontendNavigation, AuthFrontendTransport, AuthUiMessages } from "./contracts";
import { AuthError } from "./feedback";
import { acceptsAuthProviderUrl } from "./navigation";

export function AuthLogoutButton({
  transport,
  navigation,
  messages,
}: {
  transport: AuthFrontendTransport;
  navigation: AuthFrontendNavigation;
  messages: AuthUiMessages;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthFailureCode | null>(null);
  const resetAttemptState = useCallback(() => setPending(false), []);
  const beginAttempt = useAuthAttemptLifecycle(transport, navigation, "sign-out", resetAttemptState);
  const available = Boolean(transport.signOut && transport.readCsrfToken);

  const signOut = async () => {
    const attempt = beginAttempt();
    if (!attempt) return;
    if (!transport.signOut || !transport.readCsrfToken) {
      attempt.finish();
      setError("unavailable");
      return;
    }
    setPending(true);
    setError(null);
    try {
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
      if (!attempt.isCurrent()) return;
      const response = await transport.signOut({ csrfToken: csrf.token, callbackUrl: "/auth/login" }, attempt.options);
      if (!attempt.isCurrent()) return;
      if (response.status === "rejected") {
        setError(response.code);
        return;
      }
      if (response.status !== "signed-out") {
        setError("unavailable");
        return;
      }
      if (response.providerLogoutUrl !== undefined) {
        if (!acceptsAuthProviderUrl(navigation, response.providerLogoutUrl, "sign-out")) {
          if (!attempt.isCurrent()) return;
          setError("provider-error");
          return;
        }
        if (!attempt.isCurrent()) return;
        await navigation.providerRedirect(response.providerLogoutUrl, attempt.options);
        if (!attempt.isCurrent()) return;
      } else {
        if (!attempt.isCurrent()) return;
        await navigation.returnTo("/auth/login", attempt.options);
        if (!attempt.isCurrent()) return;
      }
    } catch {
      if (attempt.isCurrent()) setError("unavailable");
    } finally {
      if (attempt.finish()) setPending(false);
    }
  };

  return (
    <Stack gap="sm" aria-busy={pending}>
      {error || !available ? <AuthError code={error ?? "unavailable"} messages={messages} /> : null}
      <Button
        type="button"
        variant="subtle"
        loading={pending}
        disabled={!available || pending}
        onClick={() => void signOut()}
      >
        {messages.signOut}
      </Button>
    </Stack>
  );
}
