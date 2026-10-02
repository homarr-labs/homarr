import { sanitizeRedirectionUrl } from "@homarr/validation/redirection-url";

export * from "./permissions";

export const createLoginUrl = (redirectUrl: string) => {
  const searchParams = new URLSearchParams({ redirect: sanitizeRedirectionUrl(redirectUrl) });
  return `/auth/login?${searchParams.toString()}`;
};
