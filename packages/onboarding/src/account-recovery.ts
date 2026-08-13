interface CredentialsSignInResult {
  ok: boolean;
  error?: string | null;
}

export const didCredentialsSignInFail = (result: CredentialsSignInResult | undefined) =>
  result === undefined || !result.ok || Boolean(result.error);
