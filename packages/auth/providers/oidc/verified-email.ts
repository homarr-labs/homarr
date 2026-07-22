export const assertVerifiedEmailForCredentialsLinking = (
  profile: { email_verified?: unknown },
  isCredentialsLinkingEnabled: boolean,
) => {
  if (isCredentialsLinkingEnabled && profile.email_verified !== true) {
    throw new Error("OIDC provider did not return a verified email while credentials linking is enabled");
  }
};
