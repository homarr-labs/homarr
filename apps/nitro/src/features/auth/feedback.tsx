import { Alert, Anchor, Stack, Text } from "@mantine/core";

import type { AuthFailureCode, AuthSessionUiState, AuthUiMessages } from "./contracts";
import { authReturnPath } from "./navigation";

export function AuthError({ code, messages }: { code: AuthFailureCode; messages: AuthUiMessages }) {
  return (
    <Alert color="red" title={messages.errorTitle} role="alert">
      {messages.errors[code]}
    </Alert>
  );
}

export function AuthSessionExpiryNotice({
  session,
  callbackUrl,
  messages,
}: {
  session: AuthSessionUiState;
  callbackUrl?: string;
  messages: AuthUiMessages;
}) {
  if (session.status !== "expired") return null;
  const search = new URLSearchParams({ callbackUrl: authReturnPath(callbackUrl) });
  return (
    <Alert color="yellow" title={messages.sessionExpiredTitle} role="alert">
      <Stack gap="xs">
        <Text size="sm">{messages.sessionExpiredDescription}</Text>
        <Anchor href={`/auth/login?${search.toString()}`}>{messages.resumeSignIn}</Anchor>
      </Stack>
    </Alert>
  );
}
