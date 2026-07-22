export const assertVerifiedEmailForCredentialsLinking = (
  profile: { email?: unknown; email_verified?: unknown },
  isCredentialsLinkingEnabled: boolean,
) => {
  if (
    isCredentialsLinkingEnabled &&
    (profile.email_verified !== true || typeof profile.email !== "string" || profile.email.trim().length === 0)
  ) {
    throw new Error("OIDC provider did not return a verified email while credentials linking is enabled");
  }
};
